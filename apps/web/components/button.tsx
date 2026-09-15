import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

const STYLES = {
  primary:
    "bg-accent text-white shadow-[0_1px_1px_rgb(10_37_64/0.08),0_2px_5px_rgb(99_91_255/0.28)] " +
    "hover:-translate-y-px hover:shadow-[0_2px_4px_rgb(10_37_64/0.08),0_6px_14px_rgb(99_91_255/0.34)]",
  ghost: "bg-canvas text-ink-2 border border-line-2 hover:shadow-lift-1",
} as const;

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-ctrl px-4 py-2",
        "text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        STYLES[variant],
        className,
      ].join(" ")}
    />
  );
}
