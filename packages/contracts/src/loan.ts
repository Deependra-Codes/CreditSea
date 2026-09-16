import {
  MAX_PRINCIPAL_PAISE,
  MAX_REPAYABLE_PAISE,
  MAX_TENURE_DAYS,
  MIN_PRINCIPAL_PAISE,
  MIN_TENURE_DAYS,
  type Paise,
} from "@lms/domain";
import { z } from "zod";
import { rupeeAmount } from "./money";

export const createLoanSchema = z.object({
  amount: rupeeAmount(MIN_PRINCIPAL_PAISE, MAX_PRINCIPAL_PAISE),
  tenureDays: z
    .number()
    .int("Tenure must be a whole number of days.")
    .min(MIN_TENURE_DAYS, `Tenure must be at least ${MIN_TENURE_DAYS} days.`)
    .max(MAX_TENURE_DAYS, `Tenure cannot be more than ${MAX_TENURE_DAYS} days.`),
});

export const sanctionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z
      .string()
      .trim()
      .min(3, "Give a reason of at least 3 characters.")
      .max(500, "Keep the reason under 500 characters.")
      .optional(),
  })
  .refine((value) => value.decision !== "REJECT" || (value.reason?.length ?? 0) >= 3, {
    message: "A reason is required when rejecting",
    path: ["reason"],
  });

export const paymentSchema = z.object({
  utr: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, "A UTR is at least 6 characters.")
    .max(32, "That UTR is too long."),
  // Ceiling is a sanity bound; the real limit is the loan's outstanding balance.
  amount: rupeeAmount(1 as Paise, MAX_REPAYABLE_PAISE),
  // refine, not .max(new Date()): the latter freezes "now" at module load.
  paidAt: z.coerce
    .date()
    .refine((date) => date.getTime() <= Date.now(), "Payment date cannot be in the future"),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type SanctionInput = z.infer<typeof sanctionSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
