import { type LoanStatus, type Role, STATUS_TIMESTAMP, checkTransition } from "@lms/domain";
import type { ClientSession, UpdateQuery } from "mongoose";
import { HttpError } from "../lib/http-error";
import { Loan, type LoanDoc } from "../models/loan";

export type Actor = { id: string; role: Role };

type TransitionArgs = {
  loanId: string;
  to: LoanStatus;
  actor: Actor;
  reason?: string;
  // Required, not optional: an optional session is one a caller forgets to
  // pass, and a mongoose query without it commits outside the transaction.
  session: ClientSession;
};

const TERMINAL: readonly LoanStatus[] = ["CLOSED", "REJECTED"];

/**
 * The only place in the codebase that writes loan.status. Sanction,
 * Disbursement and Collection all route through here, so the guard, the audit
 * entry and the timestamp are applied once rather than in four places.
 */
export async function transitionLoan({
  loanId,
  to,
  actor,
  reason,
  session,
}: TransitionArgs): Promise<LoanDoc> {
  const loan = await Loan.findById(loanId).session(session);
  if (!loan) throw HttpError.notFound("Loan");

  const from = loan.status;
  const check = checkTransition(from, to, actor.role);

  if (!check.ok) {
    if (check.reason === "FORBIDDEN_ROLE") throw HttpError.forbidden();
    throw HttpError.conflict(
      "INVALID_TRANSITION",
      `A loan that is ${from.toLowerCase()} cannot be marked ${to.toLowerCase()}.`,
    );
  }

  const now = new Date();

  const update: UpdateQuery<LoanDoc> = {
    $set: { status: to, [STATUS_TIMESTAMP[to]]: now },
    $push: {
      statusHistory: {
        from,
        to,
        by: actor.id,
        byRole: actor.role,
        at: now,
        ...(reason ? { reason } : {}),
      },
    },
    // A loan that is no longer active releases the borrower's slot, which is
    // what lets them apply again.
    ...(TERMINAL.includes(to) ? { $unset: { activeBorrowerId: "" } } : {}),
  };

  // The observed status is part of the query, not only of the check above:
  // otherwise two concurrent sanctions both read APPLIED and both write.
  const updated = await Loan.findOneAndUpdate({ _id: loanId, status: from }, update, {
    new: true,
    session,
  });

  if (!updated) {
    throw HttpError.conflict(
      "CONCURRENT_UPDATE",
      "Someone else moved this loan. Reload and try again.",
    );
  }

  return updated;
}
