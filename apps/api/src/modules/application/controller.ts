import { type ApplicationResponse, type ProfileInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { requireUser } from "../../lib/request";
import { toProfileResponse } from "../../models/borrower-profile";
import { toLoanResponse } from "../../models/loan";

import { validated } from "../../middleware/validate";
import { getApplication, saveProfile, storeSalarySlip } from "./service";

export async function readApplication(req: Request, res: Response) {
  const { profile, activeLoan } = await getApplication(requireUser(req).id);

  const body: ApplicationResponse = {
    profile: profile ? toProfileResponse(profile) : null,
    activeLoan: activeLoan ? toLoanResponse(activeLoan) : null,
  };
  res.json(ok(body));
}

export async function updateProfile(req: Request, res: Response) {
  const { profile, bre } = await saveProfile(requireUser(req).id, validated<ProfileInput>(req));
  // A rejection is a 200: the request was well formed and the profile is saved,
  // which is what lets the applicant correct their details and retry.
  res.json(ok({ profile: toProfileResponse(profile), bre }));
}

export async function uploadSalarySlip(req: Request, res: Response) {
  if (!req.file) throw new HttpError(422, "FILE_REQUIRED", "Attach a salary slip.");

  const slip = await storeSalarySlip(requireUser(req).id, req.file);
  res.status(201).json(
    ok({
      salarySlip: {
        originalName: slip.originalName,
        mimeType: slip.mimeType,
        sizeBytes: slip.sizeBytes,
        uploadedAt: slip.uploadedAt.toISOString(),
      },
    }),
  );
}
