import type { ApiResult } from "@lms/contracts";
import { cookies } from "next/headers";
import { API_URL } from "./env";

/**
 * Server components have no automatic cookie jar, so the incoming request's
 * cookies are forwarded explicitly. Returns null rather than throwing: a page
 * that cannot load its data renders its empty state, not a 500.
 */
export async function serverApi<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResult<T>;
    return payload.ok ? payload.data : null;
  } catch {
    return null;
  }
}
