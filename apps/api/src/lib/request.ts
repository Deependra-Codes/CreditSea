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

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Every path param in this API names a document. Mongoose throws a BSONError on
 * anything that is not a 24-char hex string, which surfaced as a 500 — so the
 * shape is checked here, before a finder ever sees it.
 *
 * Malformed and absent both answer 404: a prober learns nothing from the
 * difference, and a document that cannot exist is not found either way.
 */
export function objectIdParam(req: Request, name: string): string {
  const value = req.params[name];
  // Express types a param as string | string[]; a repeated key must not slip through.
  if (typeof value !== "string" || !OBJECT_ID.test(value)) throw HttpError.notFound();
  return value;
}
