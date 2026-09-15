import { PAN_FORMAT, rupeesToPaise } from "@lms/domain";
import { z } from "zod";

export const EMPLOYMENT_MODES = ["SALARIED", "SELF_EMPLOYED", "UNEMPLOYED"] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  pan: z.string().trim().toUpperCase().regex(PAN_FORMAT, "Invalid PAN format"),
  dateOfBirth: z.coerce.date(),
  monthlySalary: z.number().finite().positive().transform(rupeesToPaise),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type ProfileInput = z.infer<typeof profileSchema>;
