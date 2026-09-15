import type { ProfileInput } from "@lms/contracts";
import { ACTIVE_LOAN_STATUSES, type Paise, evaluateBre } from "@lms/domain";
import { saveFile } from "../../lib/file-storage";
import {
  ALLOWED_UPLOADS,
  MAX_ORIGINAL_NAME_LENGTH,
  assertUploadAllowed,
} from "../../lib/file-type";
import { HttpError } from "../../lib/http-error";
import { BorrowerProfile } from "../../models/borrower-profile";
import { Loan } from "../../models/loan";

/**
 * The profile is saved even when the BRE rejects it. Spec §2 requires a rejected
 * applicant to fix their details and retry, which needs the record to persist.
 * Eligibility is an outcome carried in the response, not a request error.
 */
export async function saveProfile(userId: string, input: ProfileInput) {
  const bre = evaluateBre({
    pan: input.pan,
    dateOfBirth: input.dateOfBirth,
    monthlySalaryPaise: input.monthlySalary as Paise,
    employmentMode: input.employmentMode,
  });

  const profile = await BorrowerProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        fullName: input.fullName,
        pan: input.pan,
        dateOfBirth: input.dateOfBirth,
        monthlySalaryPaise: input.monthlySalary,
        employmentMode: input.employmentMode,
        bre: { ...bre, evaluatedAt: new Date() },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { profile, bre };
}

export async function storeSalarySlip(
  userId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
) {
  const type = assertUploadAllowed(file);
  const storedName = await saveFile(file.buffer, ALLOWED_UPLOADS[type].extensions[0]);

  const salarySlip = {
    storedName,
    originalName: file.originalname.slice(0, MAX_ORIGINAL_NAME_LENGTH),
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };

  const profile = await BorrowerProfile.findOneAndUpdate(
    { userId },
    { $set: { salarySlip } },
    { new: true },
  );
  if (!profile) throw new HttpError(409, "PROFILE_REQUIRED", "Save your personal details first.");

  return salarySlip;
}

export async function getApplication(userId: string) {
  const [profile, activeLoan] = await Promise.all([
    BorrowerProfile.findOne({ userId }),
    Loan.findOne({ borrowerId: userId, status: { $in: ACTIVE_LOAN_STATUSES } }),
  ]);
  return { profile, activeLoan };
}
