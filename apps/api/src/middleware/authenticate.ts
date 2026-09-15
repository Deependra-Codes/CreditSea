import type { Role } from "@lms/domain";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { HttpError } from "../lib/http-error";

export const AUTH_COOKIE = "lms_token";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    next(HttpError.unauthorized());
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(HttpError.unauthorized());
  }
}
