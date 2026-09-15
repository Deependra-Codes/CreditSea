import { loginSchema, registerSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { login, logout, me, register } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), register);
authRoutes.post("/login", validate(loginSchema), login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", authenticate, me);
