export type ApiError = { code: string; message: string; details?: unknown };

/** Discriminated so the web client unwraps every response through one path. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });

export const fail = (code: string, message: string, details?: unknown): ApiResult<never> => ({
  ok: false,
  error: details === undefined ? { code, message } : { code, message, details },
});
