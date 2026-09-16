import { PortalShell } from "@/features/application/public";
import type { ReactNode } from "react";

/**
 * The chrome is a layout, not page content: rendered by the page it vanished
 * whenever loading.tsx took over, so the header — brand, theme switch, sign out
 * — blinked out on every navigation.
 */
export default function ApplyLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
