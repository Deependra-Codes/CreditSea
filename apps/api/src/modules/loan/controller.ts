import { type CreateLoanInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { HttpError } from "../../lib/http-error";
import { pathParam, requireUser } from "../../lib/request";
import { validated } from "../../middleware/validate";
import { createLoan, getLoanForViewer, listBorrowerLoans } from "./service";

export async function apply(req: Request, res: Response) {
  const loan = await createLoan(requireUser(req).id, validated<CreateLoanInput>(req));
  res.status(201).json(ok({ loan }));
}

export async function myLoans(req: Request, res: Response) {
  res.json(ok({ loans: await listBorrowerLoans(requireUser(req).id) }));
}

export async function loanDetail(req: Request, res: Response) {
  const loanId = pathParam(req, "id");
  res.json(ok(await getLoanForViewer(requireUser(req), loanId)));
}
