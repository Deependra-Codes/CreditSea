"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type DashboardSection, MODULE_META, OVERVIEW, OVERVIEW_META } from "../model/modules";

const labelFor = (section: DashboardSection) =>
  section === OVERVIEW ? OVERVIEW_META.label : MODULE_META[section].label;

/**
 * Reads the live section from the URL rather than taking it as a prop, so the
 * header can sit in the layout and survive every navigation — passing it down
 * would tie the whole shell to the page and bring the blink back.
 */
export function SectionNav({ sections }: { sections: DashboardSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Sections">
      {sections.map((section) => {
        const href = `/dashboard/${section}`;
        const current = pathname === href;

        return (
          <Link
            key={section}
            href={href}
            aria-current={current ? "page" : undefined}
            className={[
              "rounded-ctrl px-2.5 py-1 text-sm font-semibold transition-colors",
              current ? "bg-accent-sub text-accent" : "text-ink-2 hover:bg-surface hover:text-ink",
            ].join(" ")}
          >
            {labelFor(section)}
          </Link>
        );
      })}
    </nav>
  );
}
