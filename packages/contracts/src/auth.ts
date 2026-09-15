import { ROLES } from "@lms/domain";
import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
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
