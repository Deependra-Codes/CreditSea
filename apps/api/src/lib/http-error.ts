export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static unauthorized = () => new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");

  static forbidden = () =>
    new HttpError(403, "FORBIDDEN", "Your role does not have access to this resource.");

  static notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found.`);

  static conflict = (code: string, message: string) => new HttpError(409, code, message);
}
