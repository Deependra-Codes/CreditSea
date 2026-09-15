import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="enter flex flex-col gap-1.5">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
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

      <div className="text-sm text-ink-2">{footer}</div>
    </main>
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
