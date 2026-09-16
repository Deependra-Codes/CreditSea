"use client";

import { Moon, Sun } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";
const KEY = "lms-theme";

const stamp = (theme: Theme) => document.documentElement.setAttribute("data-theme", theme);

/** Far enough to reach the corner furthest from the click, or the circle stops short. */
const radiusToFurthestCorner = (x: number, y: number) =>
  // Barely past the corner. At 6% the screen was covered by 45% of the runtime
  // and the rest animated off-screen — invisible work that reads as a stall and
  // drops frames for nothing.
  Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * 1.02;

/**
 * One switch, not three choices. Light is the product's default and the OS
 * preference is not consulted — this is an app with a look, not a document that
 * should adopt the reader's.
 *
 * The new theme is wiped in as a circle growing from the switch. Entirely
 * progressive: without View Transitions, or under reduced motion, it just
 * changes.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // Light unless someone has chosen otherwise. The OS preference is not
  // consulted: this product has a look, and the switch is how it changes.
  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      stamp(stored);
    }
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
          duration: 450,
          // easeOutCubic. Quint rushed the first third and then crawled; this
          // spreads the travel out, so the motion stays visible to the end
          // without stopping dead.
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
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
