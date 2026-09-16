import type { Role } from "@lms/domain";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { objectIdParam, requireUser } from "../../lib/request";
import { readSalarySlip } from "./service";

const REVIEWER_ROLES: readonly Role[] = ["ADMIN", "SANCTION", "DISBURSEMENT", "COLLECTION"];

/**
 * Serving uploads statically would make possession of a URL enough to read a
 * stranger's salary slip, so every read passes through this check.
 */
export async function downloadSalarySlip(req: Request, res: Response) {
  const viewer = requireUser(req);
  const ownerId = objectIdParam(req, "userId");

  if (viewer.id !== ownerId && !REVIEWER_ROLES.includes(viewer.role)) {
    throw HttpError.forbidden();
  }

  const { slip, body } = await readSalarySlip(ownerId);
  res.setHeader("Content-Type", slip.mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(slip.originalName)}"`,
  );
  res.send(body);
}
