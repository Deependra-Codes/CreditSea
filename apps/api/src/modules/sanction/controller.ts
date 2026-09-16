import { type SanctionInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { objectIdParam, requireUser } from "../../lib/request";
import { validated } from "../../middleware/validate";
import { toLoanResponse } from "../../models/loan";
import { decideSanction, sanctionQueue } from "./service";

export async function readQueue(_req: Request, res: Response) {
  const loans = await sanctionQueue();
  res.json(ok({ loans: loans.map(toLoanResponse) }));
}

export async function decide(req: Request, res: Response) {
  const loan = await decideSanction(
    objectIdParam(req, "id"),
    validated<SanctionInput>(req),
    requireUser(req),
  );
  res.json(ok({ loan: toLoanResponse(loan) }));
}
