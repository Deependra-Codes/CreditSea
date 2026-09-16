import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env";

/**
 * One line per request, in development only. Without it a call that fails on
 * its way from the browser leaves no trace on this side at all.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === "production") return next();

  const started = Date.now();
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode} in ${Date.now() - started}ms`,
    );
  });
  next();
}
