import { ROLES } from "@lms/domain";
import { z } from "zod";

// Every message here is read by a person under a form field, so each says what
// to do. Zod's defaults describe the constraint instead ("Too small: expected
// string to have >=8 characters") and leak enum members verbatim.
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // bcrypt ignores bytes past 72.
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const publicUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
