import { BadgeIndianRupee, CalendarRange, Percent } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const STAGES = [
  { label: "Applied", body: "You send your details and pick your terms.", dot: "bg-stage-1" },
  { label: "Sanctioned", body: "The sanction team reviews and approves.", dot: "bg-stage-2" },
  { label: "Disbursed", body: "Funds are released against the loan.", dot: "bg-stage-3" },
  { label: "Closed", body: "You repay, and the loan settles itself.", dot: "bg-stage-4" },
] as const;

const TERMS = [
  { icon: BadgeIndianRupee, label: "Amount", value: "₹50K – ₹5L" },
  { icon: CalendarRange, label: "Tenure", value: "30 – 365 days" },
  { icon: Percent, label: "Interest", value: "12% p.a." },
] as const;

/**
 * A split: the product on the left, the form on the right. A lone centred card
 * leaves most of a desktop screen empty and tells a first-time visitor nothing
 * about what they are signing in to. Below lg the panel drops away entirely.
 */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-canvas lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-120 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
          Lending Portal
        </span>
        <h2 className="max-w-md text-4xl font-extrabold leading-[1.08] tracking-tight">
          Four steps to a loan, and four hands that move it.
        </h2>
        <p className="max-w-sm text-sm text-ink-2">
          Borrowers apply in one sitting. Sanction, disbursement and collection each work the stage
          that is theirs.
        </p>
      </div>

      <ol className="relative flex flex-col">
        {STAGES.map((stage, index) => (
          <li key={stage.label} className="flex gap-3.5">
            <div className="flex flex-col items-center gap-1 pt-1.5">
              <span className={`size-3 shrink-0 rounded-full ${stage.dot}`} />
              {index < STAGES.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
            </div>
            <div className="flex flex-col pb-5">
              <span className="text-sm font-bold">{stage.label}</span>
              <span className="text-xs text-ink-2">{stage.body}</span>
            </div>
          </li>
        ))}
      </ol>

      <dl className="relative grid grid-cols-3 gap-3">
        {TERMS.map((term) => (
          <div
            key={term.label}
            className="flex flex-col gap-1 rounded-card bg-surface px-3 py-2.5 ring-1 ring-line-soft"
          >
            <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
              <term.icon className="size-3.5" aria-hidden />
              {term.label}
            </dt>
            <dd className="text-xs font-bold">{term.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex items-center justify-center px-5 py-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="enter flex flex-col gap-1.5">
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-[0.12em] text-accent lg:hidden"
            >
              Lending Portal
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
            <p className="text-sm text-ink-2">{subtitle}</p>
          </div>

          <div
            className="enter rounded-card bg-canvas p-6 ring-1 ring-line"
            style={{ animationDelay: "60ms" }}
          >
            {children}
          </div>

          <div className="enter text-sm text-ink-2" style={{ animationDelay: "120ms" }}>
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
      {message}
    </p>
  );
}
