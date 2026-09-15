"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Choice = "light" | "dark" | "system";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const KEY = "lms-theme";

/** "system" stamps nothing, so prefers-color-scheme keeps deciding. */
function stamp(choice: Choice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/** Far enough to reach the corner furthest from the click, or the circle stops short. */
function radiusToFurthestCorner(x: number, y: number) {
  return Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
}

/**
 * Real radio inputs rather than buttons wearing role="radio": three mutually
 * exclusive choices are what a radio group is, and the browser then supplies
 * arrow-key navigation and the correct announcement for free.
 *
 * The new theme is then wiped in as a circle growing from the control that was
 * clicked. Progressive enhancement throughout — without View Transitions, or
 * under reduced motion, the theme simply changes.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Choice | null;
    if (stored === "light" || stored === "dark") {
      setChoice(stored);
      stamp(stored);
    }
  }, []);

  function remember(next: Choice) {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // A private window can refuse storage; the choice still holds this session.
    }
  }

  function pick(next: Choice, event: MouseEvent<HTMLInputElement>) {
    remember(next);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const supported = typeof document.startViewTransition === "function";

    if (reduced || !supported) {
      setChoice(next);
      stamp(next);
      return;
    }

    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;

    // flushSync so the DOM already carries the new theme when the API snapshots it.
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setChoice(next);
        stamp(next);
      });
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radiusToFurthestCorner(x, y)}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 620,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <fieldset className="flex gap-0.5 rounded-full bg-surface p-0.5 ring-1 ring-line-soft">
      <legend className="sr-only">Colour theme</legend>

      {OPTIONS.map((option) => (
        <label
          key={option.value}
          title={option.label}
          className="grid size-6 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:text-ink has-checked:bg-accent has-checked:text-accent-ink"
        >
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={choice === option.value}
            onChange={() => undefined}
            onClick={(event) => pick(option.value, event)}
            className="sr-only"
          />
          <option.icon className="size-3.5" aria-hidden />
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
