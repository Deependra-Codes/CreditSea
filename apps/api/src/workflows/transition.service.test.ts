import type { ClientSession } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpError } from "../lib/http-error";

const findById = vi.fn();
const findOneAndUpdate = vi.fn();

vi.mock("../models/loan", () => ({
  Loan: {
    findById: (...args: unknown[]) => findById(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}));

const { transitionLoan } = await import("./transition.service");

const SESSION = {} as ClientSession;
const LOAN_ID = "6aa9851a01fa264aa9e3920d";

/** The loan as stored, reached through `.session(...)` like the real query. */
const stored = (status: string) => {
  findById.mockReturnValue({ session: () => Promise.resolve({ status }) });
};

const thrown = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (caught) {
    return caught as HttpError;
  }
  throw new Error("Expected a rejection.");
};

const move = (to: string, role: string) =>
  transitionLoan({
    loanId: LOAN_ID,
    to: to as never,
    actor: { id: "u1", role: role as never },
    session: SESSION,
  });

beforeEach(() => {
  vi.clearAllMocks();
  findOneAndUpdate.mockResolvedValue({ status: "SANCTIONED" });
});

describe("transitionLoan", () => {
  // The guard that makes two concurrent sanctions safe. If the observed status
  // ever drops out of the filter, both readers write and the audit trail lies.
  it("writes conditional on the status it observed", async () => {
    stored("APPLIED");
    await move("SANCTIONED", "SANCTION");

    expect(findOneAndUpdate.mock.calls[0]?.[0]).toEqual({ _id: LOAN_ID, status: "APPLIED" });
  });

  it("reports a conflict when someone else moved the loan first", async () => {
    stored("APPLIED");
    findOneAndUpdate.mockResolvedValue(null);

    expect((await thrown(() => move("SANCTIONED", "SANCTION"))).code).toBe("CONCURRENT_UPDATE");
  });

  it("refuses a transition that is not on the table", async () => {
    stored("APPLIED");
    const error = await thrown(() => move("CLOSED", "COLLECTION"));

    expect(error.status).toBe(409);
    expect(error.code).toBe("INVALID_TRANSITION");
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  // 403, not 409: the move is legal, this role may not make it.
  it("refuses a legal transition made by the wrong role", async () => {
    stored("APPLIED");
    const error = await thrown(() => move("SANCTIONED", "DISBURSEMENT"));

    expect(error.status).toBe(403);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("lets an admin make any legal move", async () => {
    stored("SANCTIONED");
    await move("DISBURSED", "ADMIN");

    expect(findOneAndUpdate).toHaveBeenCalled();
  });

  // Releasing the slot is what lets a borrower apply again; a loan that is
  // still running must keep it.
  it("releases the borrower's active slot only when the loan ends", async () => {
    stored("DISBURSED");
    await move("CLOSED", "COLLECTION");
    expect(findOneAndUpdate.mock.calls[0]?.[1]).toHaveProperty("$unset.activeBorrowerId");

    vi.clearAllMocks();
    findOneAndUpdate.mockResolvedValue({ status: "DISBURSED" });
    stored("SANCTIONED");
    await move("DISBURSED", "DISBURSEMENT");
    expect(findOneAndUpdate.mock.calls[0]?.[1]).not.toHaveProperty("$unset");
  });

  it("records who moved it, and the reason when there is one", async () => {
    stored("APPLIED");
    await transitionLoan({
      loanId: LOAN_ID,
      to: "REJECTED",
      actor: { id: "u9", role: "SANCTION" },
      reason: "Salary slip does not match",
      session: SESSION,
    });

    const entry = findOneAndUpdate.mock.calls[0]?.[1].$push.statusHistory;
    expect(entry).toMatchObject({
      from: "APPLIED",
      to: "REJECTED",
      by: "u9",
      byRole: "SANCTION",
      reason: "Salary slip does not match",
    });
  });
});
