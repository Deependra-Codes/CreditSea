import multer from "multer";
import { MAX_UPLOAD_BYTES } from "../lib/file-type";

// Memory storage so the bytes can be inspected before anything touches disk.
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single("file");
