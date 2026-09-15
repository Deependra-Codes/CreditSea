import type { Role } from "@lms/domain";
import type { Request } from "express";
import { HttpError } from "./http-error";

/**
 * Narrows req.user for handlers. An undefined id handed to a Mongoose finder
 * casts to an empty filter and matches an arbitrary document, so controllers
 * read the user through this rather than with `?.`.
 */
export function requireUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

/** Express types a param as string | string[]; a repeated key must not slip through. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) throw HttpError.notFound();
  return value;
}
