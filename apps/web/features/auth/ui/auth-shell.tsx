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
      <div className="flex flex-col gap-1.5">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
          Lending Portal
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
        <p className="text-sm text-ink-2">{subtitle}</p>
      </div>

      <div className="rounded-card border border-line bg-canvas p-6 shadow-lift-1">{children}</div>

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
