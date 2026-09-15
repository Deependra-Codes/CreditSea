import type { OverviewResponse } from "@lms/contracts";
import {
  ACTIVE_LOAN_STATUSES,
  LOAN_STATUSES,
  type LoanStatus,
  type Paise,
  paiseToRupees,
} from "@lms/domain";
import { Loan } from "../../models/loan";
import { Payment } from "../../models/payment";
import { User } from "../../models/user";

const rupees = (paise: number) => paiseToRupees(paise as Paise);

/**
 * The whole book at a glance. Counts and sums come from one pass over the
 * loans rather than five queries, because the interesting figures all fall
 * out of the same documents.
 */
export async function buildOverview(): Promise<Omit<OverviewResponse, "activity">> {
  const [loans, payments, borrowers] = await Promise.all([
    Loan.find({}, { status: 1, principalPaise: 1, outstandingPaise: 1, totalRepayablePaise: 1 }),
    Payment.aggregate<{ _id: null; total: number; count: number }>([
      { $group: { _id: null, total: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: "BORROWER" }),
  ]);

  const byStatus = Object.fromEntries(
    LOAN_STATUSES.map((status) => [status, { count: 0, principal: 0 }]),
  ) as Record<LoanStatus, { count: number; principal: number }>;

  let outstandingPaise = 0;
  let lentPaise = 0;

  for (const loan of loans) {
    const bucket = byStatus[loan.status];
    bucket.count += 1;
    bucket.principal += loan.principalPaise;

    if (ACTIVE_LOAN_STATUSES.includes(loan.status)) outstandingPaise += loan.outstandingPaise;
    if (loan.status === "DISBURSED" || loan.status === "CLOSED") lentPaise += loan.principalPaise;
  }

  const collected = payments[0]?.total ?? 0;

  return {
    borrowers,
    totalLoans: loans.length,
    lent: rupees(lentPaise),
    outstanding: rupees(outstandingPaise),
    collected: rupees(collected),
    paymentCount: payments[0]?.count ?? 0,
    byStatus: LOAN_STATUSES.map((status) => ({
      status,
      count: byStatus[status].count,
      principal: rupees(byStatus[status].principal),
    })),
  };
}

/** The most recent movements across every loan, newest first. */
export async function recentActivity(limit = 8): Promise<OverviewResponse["activity"]> {
  const loans = await Loan.find(
    { "statusHistory.0": { $exists: true } },
    { snapshot: 1, statusHistory: 1 },
  );

  return loans
    .flatMap((loan) =>
      loan.statusHistory.map((event) => ({
        loanId: String(loan._id),
        applicantName: loan.snapshot.fullName,
        to: event.to,
        byRole: event.byRole,
        at: event.at.toISOString(),
        ...(event.reason ? { reason: event.reason } : {}),
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
