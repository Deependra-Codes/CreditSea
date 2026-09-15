import type { LoanResponse, StatusEventResponse } from "@lms/contracts";
import { EMPLOYMENT_MODES, LOAN_STATUSES, type Paise, ROLES, paiseToRupees } from "@lms/domain";
import { type HydratedDocument, type InferSchemaType, Schema, Types, model } from "mongoose";

const statusEventSchema = new Schema(
  {
    from: { type: String, enum: LOAN_STATUSES, required: true },
    to: { type: String, enum: LOAN_STATUSES, required: true },
    by: { type: Types.ObjectId, ref: "User", required: true },
    byRole: { type: String, enum: ROLES, required: true },
    at: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false },
);

const snapshotSchema = new Schema(
  {
    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalaryPaise: { type: Number, required: true },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
  },
  { _id: false },
);

const loanSchema = new Schema(
  {
    borrowerId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    // Present only while the loan is active; $unset on CLOSED or REJECTED.
    // The partial unique index below is what actually enforces one active loan.
    activeBorrowerId: { type: Types.ObjectId, ref: "User" },

    // Frozen at apply time: a later salary edit must not move a sanctioned loan's basis.
    snapshot: { type: snapshotSchema, required: true },

    principalPaise: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    interestRateBps: { type: Number, required: true },
    interestPaise: { type: Number, required: true },
    totalRepayablePaise: { type: Number, required: true },
    outstandingPaise: { type: Number, required: true, min: 0 },

    status: { type: String, enum: LOAN_STATUSES, required: true, default: "APPLIED" },
    statusHistory: { type: [statusEventSchema], default: [] },

    appliedAt: { type: Date, required: true },
    sanctionedAt: { type: Date },
    disbursedAt: { type: Date },
    closedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true },
);

// Every dashboard module queries by status, newest first.
loanSchema.index({ status: 1, appliedAt: -1 });

// One active loan per borrower, enforced by the database. A findOne-then-create
// check lets two concurrent applications through. $exists is used because
// partialFilterExpression accepts only a restricted operator set.
loanSchema.index(
  { activeBorrowerId: 1 },
  { unique: true, partialFilterExpression: { activeBorrowerId: { $exists: true } } },
);

export const Loan = model("Loan", loanSchema);

export type LoanDoc = HydratedDocument<InferSchemaType<typeof loanSchema>>;

const rupees = (paise: number) => paiseToRupees(paise as Paise);
const iso = (date: Date | null | undefined) => (date ? { value: date.toISOString() } : undefined);

/**
 * Lives beside the schema so the two cannot drift. Going through here is what
 * keeps activeBorrowerId — an enforcement detail, not data the client needs —
 * out of every payload.
 */
export function toLoanResponse(loan: LoanDoc): LoanResponse {
  const sanctioned = iso(loan.sanctionedAt);
  const disbursed = iso(loan.disbursedAt);
  const closed = iso(loan.closedAt);
  const rejected = iso(loan.rejectedAt);

  return {
    id: String(loan._id),
    borrowerId: String(loan.borrowerId),
    applicantName: loan.snapshot.fullName,
    pan: loan.snapshot.pan,
    principal: rupees(loan.principalPaise),
    tenureDays: loan.tenureDays,
    interestRatePercent: loan.interestRateBps / 100,
    interest: rupees(loan.interestPaise),
    totalRepayable: rupees(loan.totalRepayablePaise),
    outstanding: rupees(loan.outstandingPaise),
    status: loan.status,
    statusHistory: loan.statusHistory.map(
      (event): StatusEventResponse => ({
        from: event.from,
        to: event.to,
        byRole: event.byRole,
        at: event.at.toISOString(),
        ...(event.reason ? { reason: event.reason } : {}),
      }),
    ),
    appliedAt: loan.appliedAt.toISOString(),
    ...(sanctioned ? { sanctionedAt: sanctioned.value } : {}),
    ...(disbursed ? { disbursedAt: disbursed.value } : {}),
    ...(closed ? { closedAt: closed.value } : {}),
    ...(rejected ? { rejectedAt: rejected.value } : {}),
  };
}
