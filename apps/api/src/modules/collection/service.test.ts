import type { PaymentInput } from "@lms/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpError } from "../../lib/http-error";

const create = vi.fn();
const findOneAndUpdate = vi.fn();
const transitionLoan = vi.fn();

vi.mock("../../models/payment", () => ({ Payment: { create: (...a: unknown[]) => create(...a) } }));
vi.mock("../../models/loan", () => ({
  Loan: { find: vi.fn(), findOneAndUpdate: (...a: unknown[]) => findOneAndUpdate(...a) },
}));
vi.mock("../../workflows/transition.service", () => ({
  transitionLoan: (...a: unknown[]) => transitionLoan(...a),
}));
// The real one opens a mongo session; the sequencing under test is the same.
vi.mock("../../lib/transaction", () => ({
  withTransaction: (fn: (s: unknown) => Promise<unknown>) => fn({}),
}));

const { recordPayment } = await import("./service");

const LOAN_ID = "6aa9851a01fa264aa9e3920d";
const ACTOR = { id: "u1", role: "COLLECTION" as const };
const PAYMENT = { utr: "UTR1001", amount: 1000, paidAt: new Date() } as unknown as PaymentInput;

/** What the conditional update returns: the loan after the decrement. */
const leaves = (outstandingPaise: number) => {
  findOneAndUpdate.mockResolvedValue({ outstandingPaise });
};

const thrown = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (caught) {
    return caught as HttpError;
  }
  throw new Error("Expected a rejection.");
};

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue([{ _id: "p1" }]);
  transitionLoan.mockResolvedValue({ status: "CLOSED", outstandingPaise: 0 });
});

describe("recordPayment", () => {
  // The reason the insert goes first. If the balance moved before the unique
  // index rejected the duplicate, the loan would show money that never arrived.
  it("never touches the balance when the UTR is a duplicate", async () => {
    create.mockRejectedValue({ code: 11000 });

    const error = await thrown(() => recordPayment(LOAN_ID, PAYMENT, ACTOR));

    expect(error.code).toBe("UTR_ALREADY_RECORDED");
    expect(error.message).toContain("UTR1001");
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("lets an unexpected database error through rather than calling it a duplicate", async () => {
    const boom = Object.assign(new Error("connection lost"), { code: 99 });
    create.mockRejectedValue(boom);

    await expect(recordPayment(LOAN_ID, PAYMENT, ACTOR)).rejects.toThrow("connection lost");
  });

  // Status and balance are both in the filter, so two concurrent payments
  // cannot both pass the check and overdraw the loan.
  it("decrements only while the loan is disbursed and the balance covers it", async () => {
    leaves(500);
    await recordPayment(LOAN_ID, PAYMENT, ACTOR);

    expect(findOneAndUpdate.mock.calls[0]?.[0]).toEqual({
      _id: LOAN_ID,
      status: "DISBURSED",
      outstandingPaise: { $gte: 1000 },
    });
    expect(findOneAndUpdate.mock.calls[0]?.[1]).toEqual({ $inc: { outstandingPaise: -1000 } });
  });

  it("refuses when that guarded update matches nothing", async () => {
    findOneAndUpdate.mockResolvedValue(null);

    expect((await thrown(() => recordPayment(LOAN_ID, PAYMENT, ACTOR))).code).toBe(
      "PAYMENT_REFUSED",
    );
  });

  it("leaves a part-paid loan open", async () => {
    leaves(42_000);
    const { loan } = await recordPayment(LOAN_ID, PAYMENT, ACTOR);

    expect(transitionLoan).not.toHaveBeenCalled();
    expect(loan).toMatchObject({ outstandingPaise: 42_000 });
  });

  // Exact integer equality — in floating-point rupees this balance never lands
  // on zero and the loan would stay open for ever.
  it("closes the loan the moment the balance reaches exactly zero", async () => {
    leaves(0);
    const { loan } = await recordPayment(LOAN_ID, PAYMENT, ACTOR);

    expect(transitionLoan).toHaveBeenCalledWith(
      expect.objectContaining({ loanId: LOAN_ID, to: "CLOSED", actor: ACTOR }),
    );
    expect(loan).toMatchObject({ status: "CLOSED" });
  });

  it("closes inside the same transaction, not after it", async () => {
    leaves(0);
    await recordPayment(LOAN_ID, PAYMENT, ACTOR);

    expect(transitionLoan.mock.calls[0]?.[0].session).toBeDefined();
  });
});
