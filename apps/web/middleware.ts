import { MODULE_ROLES, type ModuleName, type Role } from "@lms/domain";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "lms_token";

/**
 * Reads the role from the JWT payload without verifying the signature.
 *
 * That is deliberate: this middleware picks a destination, it does not grant
 * access. The API verifies every request, so a forged cookie buys a rendered
 * shell whose data calls all return 401 or 403.
 */
function roleFromToken(token: string | undefined): Role | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
      exp?: unknown;
    };
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
    return typeof claims.role === "string" ? (claims.role as Role) : null;
  } catch {
    return null;
  }
}

function homeFor(role: Role): string {
  if (role === "BORROWER") return "/apply";
  // Admin spans every module, so the aggregate is the sensible landing.
  if (role === "ADMIN") return "/dashboard/overview";
  const owned = (Object.keys(MODULE_ROLES) as ModuleName[]).find((module) =>
    (MODULE_ROLES[module] as readonly Role[]).includes(role),
  );
  return owned ? `/dashboard/${owned}` : "/dashboard/sanction";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = roleFromToken(req.cookies.get(AUTH_COOKIE)?.value);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!role) {
    return isAuthPage ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage || pathname === "/") {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  if (pathname.startsWith("/apply") && role !== "BORROWER") {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  if (pathname.startsWith("/dashboard") && role === "BORROWER") {
    return NextResponse.redirect(new URL("/apply", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
