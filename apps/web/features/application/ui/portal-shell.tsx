import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            Lending Portal
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
