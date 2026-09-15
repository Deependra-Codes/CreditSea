import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const uploadDir = () => path.resolve(env.UPLOAD_DIR);

/**
 * Writes bytes under a server-generated name. User input never reaches a path,
 * so traversal is impossible by construction rather than by sanitising.
 */
export async function saveFile(buffer: Buffer, extension: string): Promise<string> {
  const storedName = `${randomUUID()}${extension}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), storedName), buffer);
  return storedName;
}

export const loadFile = (storedName: string): Promise<Buffer> =>
  readFile(path.join(uploadDir(), storedName));
