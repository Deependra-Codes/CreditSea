import { describe, expect, it } from "vitest";
import { PAN_FORMAT, PAN_STRICT } from "./pan";

describe("PAN_FORMAT (enforced)", () => {
  it("accepts the canonical shape", () => {
    expect(PAN_FORMAT.test("ABCPE1234F")).toBe(true);
  });

  it("accepts demo values whose 4th char is not a real holder type", () => {
    expect(PAN_FORMAT.test("ABCDE1234F")).toBe(true); // swapping in PAN_STRICT breaks this
  });

  it("rejects wrong length, lowercase, and transposed groups", () => {
    expect(PAN_FORMAT.test("ABCDE1234")).toBe(false);
    expect(PAN_FORMAT.test("abcde1234f")).toBe(false);
    expect(PAN_FORMAT.test("ABCD12345F")).toBe(false);
    expect(PAN_FORMAT.test("")).toBe(false);
  });
});

describe("PAN_STRICT (documented, not enforced)", () => {
  it("accepts a valid individual PAN", () => {
    expect(PAN_STRICT.test("ABCPE1234F")).toBe(true);
  });

  it("rejects an invalid holder-type character", () => {
    expect(PAN_STRICT.test("ABCDE1234F")).toBe(false);
  });
});
