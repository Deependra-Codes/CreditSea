import { LogoutButton } from "@/features/dashboard/ui/logout-button";
import type { ModuleName, Role } from "@lms/domain";
import Link from "next/link";
import type { ReactNode } from "react";
import { MODULE_META, modulesFor } from "../model/modules";

export function DashboardShell({
  role,
  current,
  children,
}: {
  role: Role;
  current: ModuleName;
  children: ReactNode;
}) {
  const modules = modulesFor(role);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            Operations
          </span>

          <nav className="flex flex-wrap gap-1" aria-label="Modules">
            {modules.map((module) => (
              <Link
                key={module}
                href={`/dashboard/${module}`}
                aria-current={module === current ? "page" : undefined}
                className={[
                  "rounded-ctrl px-2.5 py-1 text-sm font-medium transition-colors",
                  module === current
                    ? "bg-accent/10 text-accent"
                    : "text-ink-2 hover:bg-surface hover:text-ink",
                ].join(" ")}
              >
                {MODULE_META[module].label}
              </Link>
            ))}
          </nav>

          <span className="ml-auto flex items-center gap-4 text-xs text-ink-3">
            <span className="font-mono">{role.toLowerCase()}</span>
            <LogoutButton />
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
