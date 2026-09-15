import { EMPLOYMENT_MODES, MAX_MONTHLY_SALARY_PAISE, type Paise } from "@lms/domain";
import { z } from "zod";
import { rupeeAmount } from "./money";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  // Shape only. The BRE owns the PAN rule, so all four eligibility failures
  // reach the client in one array with one shape.
  pan: z.string().trim().toUpperCase().length(10),
  dateOfBirth: z.coerce.date(),
  monthlySalary: rupeeAmount(1 as Paise, MAX_MONTHLY_SALARY_PAISE),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type ProfileInput = z.infer<typeof profileSchema>;
