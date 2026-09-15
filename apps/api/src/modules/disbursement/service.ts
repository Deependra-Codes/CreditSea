import { QUEUE_STATUS } from "@lms/domain";
import { withTransaction } from "../../lib/transaction";
import { Loan } from "../../models/loan";
import { type Actor, transitionLoan } from "../../workflows/transition.service";

export const disbursementQueue = () =>
  Loan.find({ status: QUEUE_STATUS.DISBURSEMENT }).sort({ sanctionedAt: 1 });

export function disburse(loanId: string, actor: Actor) {
  return withTransaction((session) => transitionLoan({ loanId, to: "DISBURSED", actor, session }));
}
