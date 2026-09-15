import { describe, expect, it } from "vitest";
import { LOAN_STATUSES } from "./transitions";
import { type ViewableLoan, canViewLoan } from "./visibility";

const loan = (over: Partial<ViewableLoan> = {}): ViewableLoan => ({
  borrowerId: "borrower-1",
  status: "APPLIED",
  actedRoles: [],
  ...over,
});

describe("canViewLoan", () => {
  it("lets the owning borrower read their own loan", () => {
    expect(canViewLoan({ id: "borrower-1", role: "BORROWER" }, loan())).toBe(true);
  });

  it("refuses a different borrower", () => {
    expect(canViewLoan({ id: "borrower-2", role: "BORROWER" }, loan())).toBe(false);
  });

  it("lets ADMIN read anything", () => {
    expect(canViewLoan({ id: "a", role: "ADMIN" }, loan({ status: "CLOSED" }))).toBe(true);
  });

  it("lets an executive read a loan sitting in their queue", () => {
    expect(canViewLoan({ id: "e", role: "SANCTION" }, loan({ status: "APPLIED" }))).toBe(true);
    expect(canViewLoan({ id: "e", role: "DISBURSEMENT" }, loan({ status: "SANCTIONED" }))).toBe(
      true,
    );
    expect(canViewLoan({ id: "e", role: "COLLECTION" }, loan({ status: "DISBURSED" }))).toBe(true);
  });

  it("refuses an executive whose queue the loan is not in", () => {
    expect(canViewLoan({ id: "e", role: "DISBURSEMENT" }, loan({ status: "APPLIED" }))).toBe(false);
    expect(canViewLoan({ id: "e", role: "COLLECTION" }, loan({ status: "SANCTIONED" }))).toBe(false);
  });

  // An executive keeps sight of a loan they moved.
  it("lets an executive follow a loan they previously acted on", () => {
    const moved = loan({ status: "DISBURSED", actedRoles: ["SANCTION"] });
    expect(canViewLoan({ id: "e", role: "SANCTION" }, moved)).toBe(true);
  });

  // SALES works the pre-application stage and must never see loan financials.
  it("refuses SALES in every status", () => {
    for (const status of LOAN_STATUSES) {
      expect(canViewLoan({ id: "s", role: "SALES" }, loan({ status }))).toBe(false);
    }
  });
});
