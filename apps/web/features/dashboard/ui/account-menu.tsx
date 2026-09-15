"use client";

import { api } from "@/lib/api";
import type { PublicUser } from "@lms/contracts";
import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

export function AccountMenu({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // A click anywhere else, or Escape, closes it — no library needed for that.
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-0.5 ring-1 ring-line transition-colors hover:ring-accent/40"
      >
        <span className="grid size-6 place-items-center rounded-full bg-accent-sub text-[10px] font-bold text-accent">
          {initials(user.fullName)}
        </span>
        <ChevronDown
          className={`size-3.5 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="enter absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-card bg-canvas ring-1 ring-line"
        >
          <div className="flex flex-col gap-0.5 border-b border-line-soft px-3.5 py-3">
            <span className="text-sm font-bold">{user.fullName}</span>
            <span className="font-mono text-[11px] text-ink-3">{user.email}</span>
            <span className="mt-1 w-fit rounded-full bg-accent-sub px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              {user.role.toLowerCase()}
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              router.replace("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-2 transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
