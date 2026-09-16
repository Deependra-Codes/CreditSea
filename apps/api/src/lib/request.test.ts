import type { Request } from "express";
import { describe, expect, it } from "vitest";
import type { HttpError } from "./http-error";
import { objectIdParam, requireUser } from "./request";

const req = (params: Record<string, unknown>) => ({ params }) as unknown as Request;

const statusOf = (run: () => unknown) => {
  try {
    run();
  } catch (caught) {
    return (caught as HttpError).status;
  }
  return 200;
};

describe("objectIdParam", () => {
  it("returns a well-formed id", () => {
    const id = "6aa9851a01fa264aa9e3920d";
    expect(objectIdParam(req({ id }), "id")).toBe(id);
  });

  // "/api/loans/mine" fell through to the /:id route, and Mongoose threw a
  // BSONError casting it — a 500 where the answer is plainly "no such loan".
  it("answers 404 for a value that is not an object id", () => {
    expect(statusOf(() => objectIdParam(req({ id: "mine" }), "id"))).toBe(404);
  });

  it("answers 404 for a repeated key, which Express hands over as an array", () => {
    expect(statusOf(() => objectIdParam(req({ id: ["6aa9851a01fa264aa9e3920d"] }), "id"))).toBe(
      404,
    );
  });

  it("answers 404 for an id of the right length that is not hex", () => {
    expect(statusOf(() => objectIdParam(req({ id: "z".repeat(24) }), "id"))).toBe(404);
  });
});

describe("requireUser", () => {
  // An undefined id reaches Mongoose as an empty filter and matches an
  // arbitrary document, so this has to refuse rather than return undefined.
  it("answers 401 when the request carries no user", () => {
    expect(statusOf(() => requireUser({} as Request))).toBe(401);
  });
});
