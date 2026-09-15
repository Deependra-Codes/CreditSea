import { loadFile } from "../../lib/file-storage";
import { HttpError } from "../../lib/http-error";
import { BorrowerProfile } from "../../models/borrower-profile";

export async function readSalarySlip(userId: string) {
  const profile = await BorrowerProfile.findOne({ userId });
  if (!profile?.salarySlip) throw HttpError.notFound("Salary slip");

  return { slip: profile.salarySlip, body: await loadFile(profile.salarySlip.storedName) };
}
