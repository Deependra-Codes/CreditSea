import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * An empty queue is a normal state, not a failure — so it says what belongs
 * here and what fills it, rather than leaving a grey line on a blank card.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="enter flex flex-col items-center gap-3 rounded-card bg-canvas px-6 py-14 text-center ring-1 ring-line">
      <span className="grid size-11 place-items-center rounded-full bg-accent-sub text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-bold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-ink-2">{body}</p>
      </div>
      {action}
    </div>
  );
}
