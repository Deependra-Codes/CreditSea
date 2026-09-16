import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo markClassName="size-6" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
