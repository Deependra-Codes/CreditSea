import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../lib/http-error";
import { errorHandler } from "./error";

function capture(err: unknown) {
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
  errorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);
  return {
    status: (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
    body: json.mock.calls[0]?.[0],
  };
}

describe("errorHandler", () => {
  it("renders an HttpError through the shared envelope", () => {
    const { status, body } = capture(HttpError.forbidden());
    expect(status).toBe(403);
    expect(body).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "Your role does not have access to this resource." },
    });
  });

  it("includes details when the error carries them", () => {
    const details = [{ path: "pan", message: "Invalid PAN format" }];
    const { body } = capture(new HttpError(422, "VALIDATION_FAILED", "Check fields.", details));
    expect(body.error.details).toEqual(details);
  });

  // The DB index prevents the duplicate; this mapping is what makes it a 409.
  it("maps a duplicate key error to 409", () => {
    const { status, body } = capture(Object.assign(new Error("E11000"), { code: 11000 }));
    expect(status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE");
  });

  it("hides unexpected errors behind a 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = capture(new Error("secret internal detail"));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret internal detail");
  });
});
