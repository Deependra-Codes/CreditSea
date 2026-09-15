import type { ApiResult } from "@lms/contracts";
import { API_URL } from "./env";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Every response is unwrapped here, so no call site inspects `ok` or reads a
 * status code. credentials: "include" is what carries the auth cookie.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData sets its own multipart boundary, so the JSON header is skipped there.
  const headers =
    init?.body instanceof FormData
      ? init.headers
      : { "content-type": "application/json", ...init?.headers };

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    ...(headers === undefined ? {} : { headers }),
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as ApiResult<T>;
  if (!payload.ok) {
    throw new ApiClientError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
    );
  }
  return payload.data;
}

type FieldIssue = { path: string; message: string };

/** Turns the API's validation details into a record every form can render. */
export function toFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const errors: Record<string, string> = {};
  for (const issue of details as FieldIssue[]) {
    if (issue?.path && issue.message && !errors[issue.path]) errors[issue.path] = issue.message;
  }
  return errors;
}
