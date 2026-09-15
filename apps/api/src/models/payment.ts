import { Schema, Types, model } from "mongoose";

const paymentSchema = new Schema(
  {
    loanId: { type: Types.ObjectId, ref: "Loan", required: true },

    // Unique in the database, not in application code: a findOne guard cannot
    // stop two concurrent requests from both passing it.
    utr: { type: String, required: true, unique: true, uppercase: true, trim: true },

    amountPaise: { type: Number, required: true, min: 1 },
    paidAt: { type: Date, required: true },
    recordedBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ loanId: 1, paidAt: -1 });

export const Payment = model("Payment", paymentSchema);
