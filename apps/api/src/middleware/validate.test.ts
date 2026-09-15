import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { HttpError } from "../lib/http-error";
import { validate, validated } from "./validate";

const schema = z.object({ age: z.number().int().min(18) });

function run(body: unknown) {
  const req = { body } as Request;
  const next = vi.fn();
  validate(schema)(req, {} as Response, next as unknown as NextFunction);
  return { req, error: next.mock.calls[0]?.[0] as HttpError | undefined };
}

describe("validate", () => {
  it("puts the parsed value on req.valid", () => {
    const { req, error } = run({ age: 30 });
    expect(error).toBeUndefined();
    expect(validated<{ age: number }>(req)).toEqual({ age: 30 });
  });

  // The web client consumes this shape, so it is a contract.
  it("reports a 422 with per-field details", () => {
    const { error } = run({ age: 12 });
    expect(error?.status).toBe(422);
    expect(error?.code).toBe("VALIDATION_FAILED");
    expect(error?.details).toEqual([{ path: "age", message: expect.stringContaining("18") }]);
  });

  it("does not set req.valid when validation fails", () => {
    expect(run({ age: 12 }).req.valid).toBeUndefined();
  });
});
