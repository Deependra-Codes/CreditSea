import type { Role } from "@lms/domain";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

/** ADMIN is one explicit clause here, mirroring checkTransition in the domain. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(HttpError.unauthorized());
      return;
    }
    if (req.user.role === "ADMIN" || roles.includes(req.user.role)) {
      next();
      return;
    }
    next(HttpError.forbidden());
  };
