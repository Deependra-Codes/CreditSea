import type { PaymentInput } from "@lms/contracts";
import { QUEUE_STATUS } from "@lms/domain";
import { HttpError } from "../../lib/http-error";
import { withTransaction } from "../../lib/transaction";
import { Loan } from "../../models/loan";
import { Payment } from "../../models/payment";
import { type Actor, transitionLoan } from "../../workflows/transition.service";

export const collectionQueue = () =>
  Loan.find({ status: QUEUE_STATUS.COLLECTION }).sort({ disbursedAt: 1 });

export const paymentsFor = (loanId: string) => Payment.find({ loanId }).sort({ paidAt: -1 });

/**
 * Insert, decrement and any resulting close commit together or not at all.
 * Without that, a duplicate UTR — which this system rejects by design, so it is
 * an expected path — could leave a balance that says money arrived with no
 * payment behind it.
 */
export function recordPayment(loanId: string, input: PaymentInput, actor: Actor) {
  return withTransaction(async (session) => {
    // Insert first: a duplicate UTR then fails before the balance moves.
    const [payment] = await Payment.create(
      [
        {
          loanId,
          utr: input.utr,
          amountPaise: input.amount,
          paidAt: input.paidAt,
          recordedBy: actor.id,
        },
      ],
      { session },
    );

    // Condition and decrement in one operation, so two concurrent payments
    // cannot both pass the check.
    const loan = await Loan.findOneAndUpdate(
      { _id: loanId, status: "DISBURSED", outstandingPaise: { $gte: input.amount } },
      { $inc: { outstandingPaise: -input.amount } },
      { new: true, session },
    );

    if (!loan) {
      throw HttpError.conflict(
        "PAYMENT_REFUSED",
        "This loan is not open for payment, or the amount is more than the outstanding balance.",
      );
    }

    // Exact integer equality — the whole reason money is stored in paise.
    const settled =
      loan.outstandingPaise === 0
        ? await transitionLoan({ loanId, to: "CLOSED", actor, session })
        : loan;

    if (!payment) throw new Error("Payment insert returned nothing.");
    return { payment, loan: settled };
  });
}
