"use client";

import { Check } from "lucide-react";

// Mirrors apps/api/src/seed/accounts.ts. Safe to show because these are seeded
// demo accounts on a demo database — noted as such in the README.
const DEMO_PASSWORD = "Password@123";

const ACCOUNTS = [
  { email: "borrower@lms.test", role: "Borrower", does: "applies for a loan" },
  { email: "sales@lms.test", role: "Sales", does: "tracks leads" },
  { email: "sanction@lms.test", role: "Sanction", does: "approves or rejects" },
  { email: "disbursement@lms.test", role: "Disbursement", does: "releases funds" },
  { email: "collection@lms.test", role: "Collection", does: "records payments" },
  { email: "admin@lms.test", role: "Admin", does: "sees every module" },
] as const;

/**
 * Each row is a control, so it is shaped like one — a ring, a pointer, and a
 * filled state. Left as bare text with only a hover tint, nothing said they
 * could be clicked or which one was already in the form.
 */
export function DemoAccounts({
  selectedEmail,
  onPick,
}: {
  selectedEmail: string;
  onPick: (email: string, password: string) => void;
}) {
  return (
    <details className="mt-2 text-xs text-ink-3">
      <summary className="cursor-pointer select-none font-semibold text-ink-2">
        Demo accounts — one per role
      </summary>

      {/* Above the list: read last, it explains the rows you already scanned. */}
      <p className="mt-1.5">
        Pick a role to fill the form. Every account uses{" "}
        <span className="font-mono text-ink-2">{DEMO_PASSWORD}</span>.
      </p>

      <ul className="mt-2 flex flex-col gap-1.5">
        {ACCOUNTS.map((account) => {
          const active = account.email === selectedEmail;

          return (
            <li key={account.email}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onPick(account.email, DEMO_PASSWORD)}
                className={[
                  "flex w-full cursor-pointer items-center gap-2 rounded-ctrl px-2.5 py-2 text-left",
                  "ring-1 transition-colors duration-150 ease-(--ease-standard)",
                  active
                    ? "bg-accent-sub text-accent ring-accent/40"
                    : "ring-line-soft hover:bg-surface hover:ring-line",
                ].join(" ")}
              >
                <span
                  className={`w-24 shrink-0 font-semibold ${active ? "text-accent" : "text-ink-2"}`}
                >
                  {account.role}
                </span>
                {/* The longest address only just clears a 400px screen, so it
                    truncates rather than pushing the row wider. */}
                <span
                  className={`min-w-0 truncate font-mono ${active ? "text-accent" : "text-ink-3"}`}
                >
                  {account.email}
                </span>
                <span className="ml-auto hidden sm:inline">{account.does}</span>
                {/* Always laid out, so picking a row does not shift the others. */}
                <Check
                  className={`size-3.5 shrink-0 stroke-[3] ${active ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
