import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { env } from "../lib/env";
import type { HttpError } from "../lib/http-error";
import { AUTH_COOKIE, authenticate } from "./authenticate";

function run(cookies: Record<string, string>) {
  const req = { cookies } as Request;
  const next = vi.fn();
  authenticate(req, {} as Response, next as unknown as NextFunction);
  return { req, error: next.mock.calls[0]?.[0] as HttpError | undefined };
}

const sign = (payload: object, secret = env.JWT_SECRET, expiresIn = "1h") =>
  jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

describe("authenticate", () => {
  it("populates req.user from a valid token", () => {
    const { req, error } = run({ [AUTH_COOKIE]: sign({ sub: "u1", role: "SANCTION" }) });
    expect(error).toBeUndefined();
    expect(req.user).toEqual({ id: "u1", role: "SANCTION" });
  });

  it("rejects a missing cookie with 401", () => {
    expect(run({}).error?.status).toBe(401);
  });

  it("rejects a malformed token with 401", () => {
    expect(run({ [AUTH_COOKIE]: "not-a-jwt" }).error?.status).toBe(401);
  });

  // A token signed with another secret must not be trusted.
  it("rejects a token signed with the wrong secret with 401", () => {
    const forged = sign({ sub: "u1", role: "ADMIN" }, "an-entirely-different-secret");
    expect(run({ [AUTH_COOKIE]: forged }).error?.status).toBe(401);
  });

  it("rejects an expired token with 401", () => {
    const expired = jwt.sign({ sub: "u1", role: "ADMIN" }, env.JWT_SECRET, { expiresIn: "-1s" });
    expect(run({ [AUTH_COOKIE]: expired }).error?.status).toBe(401);
  });
});
