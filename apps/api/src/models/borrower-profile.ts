import { EMPLOYMENT_MODES } from "@lms/contracts";
import { Schema, Types, model } from "mongoose";

const salarySlipSchema = new Schema(
  {
    storedName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const borrowerProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, unique: true, uppercase: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalaryPaise: { type: Number, required: true, min: 0 },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
    bre: {
      passed: { type: Boolean, required: true },
      failures: [{ _id: false, code: String, message: String }],
      evaluatedAt: { type: Date, required: true },
    },
    salarySlip: { type: salarySlipSchema, default: null },
  },
  { timestamps: true },
);

export const BorrowerProfile = model("BorrowerProfile", borrowerProfileSchema);
