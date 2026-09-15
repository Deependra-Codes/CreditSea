"use client";

import { Moon, Sun } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";
const KEY = "lms-theme";

const stamp = (theme: Theme) => document.documentElement.setAttribute("data-theme", theme);

/** Far enough to reach the corner furthest from the click, or the circle stops short. */
const radiusToFurthestCorner = (x: number, y: number) =>
  Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

/**
 * One switch, not three choices. The OS preference still decides what a first
 * visit looks like — it is simply not a third button, because "system" is the
 * state you are already in before you touch anything.
 *
 * The new theme is wiped in as a circle growing from the switch. Entirely
 * progressive: without View Transitions, or under reduced motion, it just
 * changes.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    const resolved =
      stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(resolved);
    if (stored) stamp(stored);
  }, []);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";

    try {
      localStorage.setItem(KEY, next);
    } catch {
      // A private window can refuse storage; the choice still holds this session.
    }

    const plain = () => {
      setTheme(next);
      stamp(next);
    };

    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof document.startViewTransition !== "function"
    ) {
      plain();
      return;
    }

    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;

    // flushSync so the DOM already carries the new theme when the API snapshots it.
    const transition = document.startViewTransition(() => flushSync(plain));

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radiusToFurthestCorner(x, y)}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  const nextLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      title={nextLabel}
      aria-label={nextLabel}
      className="grid size-8 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-line-soft transition-colors hover:text-ink hover:ring-accent/40"
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
