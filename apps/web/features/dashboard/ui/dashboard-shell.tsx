import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PublicUser } from "@lms/contracts";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  type DashboardSection,
  MODULE_META,
  OVERVIEW,
  OVERVIEW_META,
  sectionsFor,
} from "../model/modules";
import { AccountMenu } from "./account-menu";

const labelFor = (section: DashboardSection) =>
  section === OVERVIEW ? OVERVIEW_META.label : MODULE_META[section].label;

export function DashboardShell({
  user,
  current,
  children,
}: {
  user: PublicUser;
  current: DashboardSection;
  children: ReactNode;
}) {
  const sections = sectionsFor(user.role);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link href="/" aria-label="Marg Lending">
            <Logo markClassName="size-6" showWord={false} />
          </Link>

          <nav className="flex flex-wrap gap-1" aria-label="Sections">
            {sections.map((section) => (
              <Link
                key={section}
                href={`/dashboard/${section}`}
                aria-current={section === current ? "page" : undefined}
                className={[
                  "rounded-ctrl px-2.5 py-1 text-sm font-semibold transition-colors",
                  section === current
                    ? "bg-accent-sub text-accent"
                    : "text-ink-2 hover:bg-surface hover:text-ink",
                ].join(" ")}
              >
                {labelFor(section)}
              </Link>
            ))}
          </nav>

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
