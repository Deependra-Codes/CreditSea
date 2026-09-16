import { serverApi } from "@/lib/server-api";
import type { PublicUser } from "@lms/contracts";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "../ui/dashboard-shell";

/**
 * The chrome lives here rather than in the page so it survives a navigation:
 * rendered by the page, loading.tsx replaced the header along with the content
 * and the whole bar blinked out on every module switch.
 *
 * It sits above [module] on purpose. Inside it, a new module would be a new
 * route for this layout too, and it would re-render — which is the blink again.
 */
export async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await serverApi<{ user: PublicUser }>("/api/auth/me");
  if (!session) notFound();

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
