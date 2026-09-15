import { ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { pathParam, requireUser } from "../../lib/request";
import { toLoanResponse } from "../../models/loan";
import { disburse, disbursementQueue } from "./service";

export async function readQueue(_req: Request, res: Response) {
  const loans = await disbursementQueue();
  res.json(ok({ loans: loans.map(toLoanResponse) }));
}

export async function release(req: Request, res: Response) {
  const loan = await disburse(pathParam(req, "id"), requireUser(req));
  res.json(ok({ loan: toLoanResponse(loan) }));
}
