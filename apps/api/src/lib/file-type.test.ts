import { describe, expect, it } from "vitest";
import { assertUploadAllowed, detectFileType } from "./file-type";
import type { HttpError } from "./http-error";

const pdf = Buffer.from("255044462d312e34", "hex"); // %PDF-1.4
const jpeg = Buffer.from("ffd8ffe000104a464946", "hex");
const png = Buffer.from("89504e470d0a1a0a0000000d", "hex");
const html = Buffer.from("<!doctype html><script>alert(1)</script>", "utf8");

const upload = (buffer: Buffer, mimetype: string, originalname: string) => ({
  buffer,
  mimetype,
  originalname,
});

const statusOf = (file: Parameters<typeof assertUploadAllowed>[0]) => {
  try {
    assertUploadAllowed(file);
    return 200;
  } catch (error) {
    return (error as HttpError).status;
  }
};

describe("detectFileType", () => {
  it("identifies each accepted type by its magic bytes", () => {
    expect(detectFileType(pdf)).toBe("pdf");
    expect(detectFileType(jpeg)).toBe("jpeg");
    expect(detectFileType(png)).toBe("png");
  });

  it("returns null for anything else, including an empty buffer", () => {
    expect(detectFileType(html)).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe("assertUploadAllowed", () => {
  it("accepts a well-formed upload of each type", () => {
    expect(assertUploadAllowed(upload(pdf, "application/pdf", "slip.pdf"))).toBe("pdf");
    expect(assertUploadAllowed(upload(jpeg, "image/jpeg", "slip.JPEG"))).toBe("jpeg");
    expect(assertUploadAllowed(upload(png, "image/png", "slip.png"))).toBe("png");
  });

  // The declared mimetype is a client claim; the bytes are the evidence.
  it("rejects a script disguised with a PDF name and mimetype", () => {
    expect(statusOf(upload(html, "application/pdf", "slip.pdf"))).toBe(415);
  });

  it("rejects a real PNG carrying a disallowed extension", () => {
    expect(statusOf(upload(png, "image/png", "slip.exe"))).toBe(415);
  });

  it("rejects content that disagrees with its extension", () => {
    expect(statusOf(upload(png, "application/pdf", "slip.pdf"))).toBe(415);
  });

  it("rejects content that disagrees with its declared mimetype", () => {
    expect(statusOf(upload(png, "application/pdf", "slip.png"))).toBe(415);
  });
});
