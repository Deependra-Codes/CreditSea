import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-ctrl bg-canvas px-3 py-2 text-sm text-ink ring-1 ring-line " +
  "transition-shadow duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] " +
  "focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  // Explicitly `| undefined`: a lookup into a field-error record yields that,
  // and exactOptionalPropertyTypes treats "absent" and "undefined" as different.
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-critical">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
