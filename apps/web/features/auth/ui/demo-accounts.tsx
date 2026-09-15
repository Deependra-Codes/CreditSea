"use client";

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

export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <details className="mt-2 text-xs text-ink-3">
      <summary className="cursor-pointer select-none font-medium">
        Demo accounts — one per role
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPick(account.email, DEMO_PASSWORD)}
              className="flex w-full items-baseline gap-2 rounded-ctrl px-2 py-1.5 text-left hover:bg-surface"
            >
              <span className="w-24 shrink-0 font-semibold text-ink-2">{account.role}</span>
              <span className="font-mono text-ink-3">{account.email}</span>
              <span className="ml-auto hidden sm:inline">{account.does}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-2">
        Every account uses <span className="font-mono">{DEMO_PASSWORD}</span>. Click one to fill the
        form.
      </p>
    </details>
  );
}
