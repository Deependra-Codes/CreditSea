import { EMPLOYMENT_MODES, MAX_MONTHLY_SALARY_PAISE, PAN_FORMAT, type Paise } from "@lms/domain";
import { z } from "zod";
import { rupeeAmount } from "./money";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  pan: z.string().trim().toUpperCase().regex(PAN_FORMAT, "Invalid PAN format"),
  dateOfBirth: z.coerce.date(),
  monthlySalary: rupeeAmount(1 as Paise, MAX_MONTHLY_SALARY_PAISE),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type ProfileInput = z.infer<typeof profileSchema>;
