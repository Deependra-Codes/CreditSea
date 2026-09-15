import { type ProfileInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { requireUser } from "../../lib/request";
import { validated } from "../../middleware/validate";
import { getApplication, saveProfile, storeSalarySlip } from "./service";

export async function readApplication(req: Request, res: Response) {
  res.json(ok(await getApplication(requireUser(req).id)));
}

export async function updateProfile(req: Request, res: Response) {
  const input = validated<ProfileInput>(req);
  res.json(ok(await saveProfile(requireUser(req).id, input)));
}

export async function uploadSalarySlip(req: Request, res: Response) {
  if (!req.file) throw new HttpError(422, "FILE_REQUIRED", "Attach a salary slip.");
  const salarySlip = await storeSalarySlip(requireUser(req).id, req.file);
  res.status(201).json(ok({ salarySlip }));
}
