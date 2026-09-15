import { type Paise, formatPaise, rupeesToPaise } from "@lms/domain";
import { z } from "zod";

/**
 * The one place rupees become paise. Payloads speak rupees; storage speaks paise.
 *
 * rupeesToPaise throws on values outside safe integer range, and zod does not
 * catch non-Zod throws inside a transform — it would escape safeParse and
 * surface as a 500. The try/catch turns it into a normal validation issue.
 */
export const rupeeAmount = (minPaise: Paise, maxPaise: Paise) =>
  z
    .number()
    .finite()
    .positive()
    .transform((rupees, ctx) => {
      try {
        return rupeesToPaise(rupees);
      } catch {
        ctx.addIssue({ code: "custom", message: "Amount is out of range." });
        return z.NEVER;
      }
    })
    .refine((paise) => paise >= minPaise && paise <= maxPaise, {
      message: `Amount must be between ${formatPaise(minPaise)} and ${formatPaise(maxPaise)}`,
    });
