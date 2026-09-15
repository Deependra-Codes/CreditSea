import type { ProfileResponse } from "@lms/contracts";
import { EMPLOYMENT_MODES, type Paise, paiseToRupees } from "@lms/domain";
import { type HydratedDocument, type InferSchemaType, Schema, Types, model } from "mongoose";

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

export type BorrowerProfileDoc = HydratedDocument<InferSchemaType<typeof borrowerProfileSchema>>;

/** `storedName` stays server-side: the file is fetched by owner, never by path. */
export function toProfileResponse(profile: BorrowerProfileDoc): ProfileResponse {
  const slip = profile.salarySlip;

  return {
    id: String(profile._id),
    fullName: profile.fullName,
    pan: profile.pan,
    dateOfBirth: profile.dateOfBirth.toISOString(),
    monthlySalary: paiseToRupees(profile.monthlySalaryPaise as Paise),
    employmentMode: profile.employmentMode,
    bre: {
      passed: profile.bre?.passed ?? false,
      failures: (profile.bre?.failures ?? []).map((failure) => ({
        code: failure.code as ProfileResponse["bre"]["failures"][number]["code"],
        message: failure.message as string,
      })),
      evaluatedAt: (profile.bre?.evaluatedAt ?? new Date()).toISOString(),
    },
    salarySlip: slip
      ? {
          originalName: slip.originalName,
          mimeType: slip.mimeType,
          sizeBytes: slip.sizeBytes,
          uploadedAt: slip.uploadedAt.toISOString(),
        }
      : null,
  };
}
