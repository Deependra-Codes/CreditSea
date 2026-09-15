import path from "node:path";
import { HttpError } from "./http-error";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_ORIGINAL_NAME_LENGTH = 255;

export type AllowedFileType = "pdf" | "jpeg" | "png";

type UploadSpec = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  magic: readonly number[];
};

export const ALLOWED_UPLOADS = {
  pdf: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    magic: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  jpeg: {
    extensions: [".jpg", ".jpeg"],
    mimeTypes: ["image/jpeg"],
    magic: [0xff, 0xd8, 0xff],
  },
  png: {
    extensions: [".png"],
    mimeTypes: ["image/png"],
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
} as const satisfies Record<AllowedFileType, UploadSpec>;

const startsWith = (buffer: Buffer, magic: readonly number[]) =>
  buffer.length >= magic.length && magic.every((byte, index) => buffer[index] === byte);

/** Identifies a file by its content. A declared mimetype is a claim, not evidence. */
export function detectFileType(buffer: Buffer): AllowedFileType | null {
  for (const [type, spec] of Object.entries(ALLOWED_UPLOADS)) {
    if (startsWith(buffer, spec.magic)) return type as AllowedFileType;
  }
  return null;
}

export function assertUploadAllowed(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}): AllowedFileType {
  const detected = detectFileType(file.buffer);
  if (detected === null) {
    throw new HttpError(415, "UNSUPPORTED_FILE", "Upload a PDF, JPG or PNG file.");
  }

  // Widened: indexing the const map yields a union whose tuple members do not
  // overlap, which narrows includes() to never.
  const spec: UploadSpec = ALLOWED_UPLOADS[detected];
  const extension = path.extname(file.originalname).toLowerCase();

  // Content, extension and declared type must all agree.
  if (!spec.extensions.includes(extension) || !spec.mimeTypes.includes(file.mimetype)) {
    throw new HttpError(415, "UNSUPPORTED_FILE", "The file does not match its name or type.");
  }

  return detected;
}
