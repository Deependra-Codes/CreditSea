import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-ctrl border border-line-2 bg-canvas px-3 py-2 text-sm text-ink " +
  "shadow-[0_1px_1px_rgb(10_37_64/0.04)] " +
  "focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-critical">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
