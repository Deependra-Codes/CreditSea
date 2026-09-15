import { type LoginInput, type PublicUser, type RegisterInput, ok } from "@lms/contracts";
import type { Role } from "@lms/domain";
import type { Request, Response } from "express";
import { env } from "../../lib/env";
import { HttpError } from "../../lib/http-error";
import { AUTH_COOKIE } from "../../middleware/authenticate";
import { validated } from "../../middleware/validate";
import { User } from "../../models/user";
import { TOKEN_TTL_SECONDS, hashPassword, signToken, verifyPassword } from "./auth.service";

type UserRow = { _id: unknown; fullName: string; email: string; role: string };

const toPublicUser = (user: UserRow): PublicUser => ({
  id: String(user._id),
  fullName: user.fullName,
  email: user.email,
  role: user.role as Role,
});

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export async function register(req: Request, res: Response) {
  const { fullName, email, password } = validated<RegisterInput>(req);

  if (await User.exists({ email })) {
    throw HttpError.conflict("EMAIL_TAKEN", "An account with this email already exists.");
  }

  // Self-registration never grants an executive role.
  const user = await User.create({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    role: "BORROWER",
  });

  setAuthCookie(res, signToken({ sub: String(user._id), role: "BORROWER" }));
  res.status(201).json(ok({ user: toPublicUser(user) }));
}

export async function login(req: Request, res: Response) {
  const { email, password } = validated<LoginInput>(req);
  const user = await User.findOne({ email });

  // Same message either way, so responses cannot be used to enumerate accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  setAuthCookie(res, signToken({ sub: String(user._id), role: user.role as Role }));
  res.json(ok({ user: toPublicUser(user) }));
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user?.id);
  if (!user) throw HttpError.unauthorized();
  res.json(ok({ user: toPublicUser(user) }));
}
