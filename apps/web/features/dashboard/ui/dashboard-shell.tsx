import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PublicUser } from "@lms/contracts";
import Link from "next/link";
import type { ReactNode } from "react";
import { sectionsFor } from "../model/modules";
import { AccountMenu } from "./account-menu";
import { SectionNav } from "./section-nav";

export function DashboardShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link href="/" aria-label="Marg Lending">
            <Logo markClassName="size-6" showWord={false} />
          </Link>

          <SectionNav sections={sectionsFor(user.role)} />

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
