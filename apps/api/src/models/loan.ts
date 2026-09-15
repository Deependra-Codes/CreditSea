import { EMPLOYMENT_MODES, LOAN_STATUSES, ROLES } from "@lms/domain";
import { Schema, Types, model } from "mongoose";

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

const loanSchema = new Schema(
  {
    borrowerId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    // Present only while the loan is active; $unset on CLOSED or REJECTED.
    // The partial unique index below is what actually enforces one active loan.
    activeBorrowerId: { type: Types.ObjectId, ref: "User" },

    // Frozen at apply time: a later salary edit must not move a sanctioned loan's basis.
    snapshot: {
      fullName: { type: String, required: true },
      pan: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      monthlySalaryPaise: { type: Number, required: true },
      employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
    },

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
