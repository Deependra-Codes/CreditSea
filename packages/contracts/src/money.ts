import { type Paise, paiseToRupees, rupeesToPaise } from "@lms/domain";
import { z } from "zod";

/** The one place rupees become paise. Payloads speak rupees; storage speaks paise. */
export const rupeeAmount = (minPaise: Paise, maxPaise: Paise) =>
  z
    .number()
    .finite()
    .positive()
    .transform(rupeesToPaise)
    .refine((paise) => paise >= minPaise && paise <= maxPaise, {
      message: `Amount must be between ₹${paiseToRupees(minPaise)} and ₹${paiseToRupees(maxPaise)}`,
    });

/** Outbound direction: integer paise back to rupees for the wire. */
export const toWireRupees = (paise: number): number => paiseToRupees(paise as Paise);
