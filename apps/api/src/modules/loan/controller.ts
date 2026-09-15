import { type CreateLoanInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { pathParam, requireUser } from "../../lib/request";
import { toLoanResponse } from "../../models/loan";
import { toPaymentResponse } from "../../models/payment";

import { validated } from "../../middleware/validate";
import { createLoan, getLoanForViewer, listBorrowerLoans } from "./service";

export async function apply(req: Request, res: Response) {
  const loan = await createLoan(requireUser(req).id, validated<CreateLoanInput>(req));
  res.status(201).json(ok({ loan: toLoanResponse(loan) }));
}

export async function myLoans(req: Request, res: Response) {
  const loans = await listBorrowerLoans(requireUser(req).id);
  res.json(ok({ loans: loans.map(toLoanResponse) }));
}

export async function loanDetail(req: Request, res: Response) {
  const { loan, payments } = await getLoanForViewer(requireUser(req), pathParam(req, "id"));
  res.json(ok({ loan: toLoanResponse(loan), payments: payments.map(toPaymentResponse) }));
}
