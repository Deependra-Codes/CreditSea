import type { Role } from "@lms/domain";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../lib/http-error";
import { authorize } from "./authorize";

const errorFrom = (role: Role | undefined, allowed: Role[]): unknown => {
  const req = { user: role ? { id: "u1", role } : undefined } as Request;
  const next = vi.fn();
  authorize(...allowed)(req, {} as Response, next as unknown as NextFunction);
  return next.mock.calls[0]?.[0];
};

describe("authorize", () => {
  it("passes a permitted role through", () => {
    expect(errorFrom("SANCTION", ["SANCTION"])).toBeUndefined();
  });

  it("always permits ADMIN", () => {
    expect(errorFrom("ADMIN", ["COLLECTION"])).toBeUndefined();
  });

  // 401 and 403 are different failures and the client reacts differently.
  it("rejects a wrong role with 403", () => {
    const error = errorFrom("SALES", ["SANCTION"]);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(403);
  });

  it("rejects an unauthenticated request with 401", () => {
    expect((errorFrom(undefined, ["SANCTION"]) as HttpError).status).toBe(401);
  });

  it("rejects a borrower from every executive route", () => {
    for (const allowed of [["SALES"], ["SANCTION"], ["DISBURSEMENT"], ["COLLECTION"]] as Role[][]) {
      expect((errorFrom("BORROWER", allowed) as HttpError).status).toBe(403);
    }
  });
});
