import type { SanctionInput } from "@lms/contracts";
import { QUEUE_STATUS } from "@lms/domain";
import { withTransaction } from "../../lib/transaction";
import { Loan } from "../../models/loan";
import { type Actor, transitionLoan } from "../../workflows/transition.service";

/** Oldest first: a work queue is worked in the order people joined it. */
export const sanctionQueue = () =>
  Loan.find({ status: QUEUE_STATUS.SANCTION }).sort({ appliedAt: 1 });

export function decideSanction(loanId: string, input: SanctionInput, actor: Actor) {
  return withTransaction((session) =>
    transitionLoan({
      loanId,
      to: input.decision === "APPROVE" ? "SANCTIONED" : "REJECTED",
      actor,
      ...(input.reason ? { reason: input.reason } : {}),
      session,
    }),
  );
}
