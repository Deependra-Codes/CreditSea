import { EMPLOYMENT_MODES, MAX_MONTHLY_SALARY_PAISE, type Paise } from "@lms/domain";
import { z } from "zod";
import { rupeeAmount } from "./money";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  // Shape only. The BRE owns the PAN rule, so all four eligibility failures
  // reach the client in one array with one shape.
  pan: z.string().trim().toUpperCase().length(10, "A PAN is exactly 10 characters."),
  dateOfBirth: z.coerce.date("Enter a valid date of birth."),
  monthlySalary: rupeeAmount(1 as Paise, MAX_MONTHLY_SALARY_PAISE),
  employmentMode: z.enum(EMPLOYMENT_MODES, "Choose an employment type."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
