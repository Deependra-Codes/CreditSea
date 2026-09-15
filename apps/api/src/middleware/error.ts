import { fail } from "@lms/contracts";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail("NOT_FOUND", "Route not found."));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }

  // Duplicate key from a unique index; the UTR path depends on this.
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json(fail("DUPLICATE", "That value already exists."));
    return;
  }

  console.error(err);
  res.status(500).json(fail("INTERNAL", "Something went wrong."));
}
