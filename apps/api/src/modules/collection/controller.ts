import { type PaymentInput, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { pathParam, requireUser } from "../../lib/request";
import { validated } from "../../middleware/validate";
import { toLoanResponse } from "../../models/loan";
import { toPaymentResponse } from "../../models/payment";
import { collectionQueue, paymentsFor, recordPayment } from "./service";

export async function readQueue(_req: Request, res: Response) {
  const loans = await collectionQueue();
  res.json(ok({ loans: loans.map(toLoanResponse) }));
}

export async function readPayments(req: Request, res: Response) {
  const payments = await paymentsFor(pathParam(req, "id"));
  res.json(ok({ payments: payments.map(toPaymentResponse) }));
}

export async function addPayment(req: Request, res: Response) {
  const { payment, loan } = await recordPayment(
    pathParam(req, "id"),
    validated<PaymentInput>(req),
    requireUser(req),
  );
  res.status(201).json(ok({ payment: toPaymentResponse(payment), loan: toLoanResponse(loan) }));
}
