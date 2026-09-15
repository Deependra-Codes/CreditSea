import type { Role } from "@lms/domain";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../lib/env";

const BCRYPT_ROUNDS = 10;
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const signToken = (payload: { sub: string; role: Role }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
