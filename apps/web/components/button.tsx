import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

const STYLES = {
  primary: "bg-accent text-accent-ink hover:-translate-y-px hover:brightness-110",
  ghost: "bg-canvas text-ink-2 ring-1 ring-line hover:text-ink hover:ring-accent/40",
} as const;

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-ctrl px-4 py-2",
        "text-sm font-bold transition-[transform,filter,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100",
        STYLES[variant],
        className,
      ].join(" ")}
    />
  );
}
