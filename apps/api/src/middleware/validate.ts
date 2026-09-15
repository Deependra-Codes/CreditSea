import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../lib/http-error";

declare global {
  namespace Express {
    interface Request {
      valid?: unknown;
    }
  }
}

/** Parsed output lands on req.valid so handlers never touch raw req.body. */
export const validate =
  <T>(schema: ZodType<T>, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(
        new HttpError(
          422,
          "VALIDATION_FAILED",
          "Check the highlighted fields.",
          result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    req.valid = result.data;
    next();
  };

export const validated = <T>(req: Request): T => {
  if (req.valid === undefined) {
    throw new Error("validate() middleware is missing on this route.");
  }
  return req.valid as T;
};
