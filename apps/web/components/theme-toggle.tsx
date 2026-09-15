"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Choice = "light" | "dark" | "system";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const KEY = "lms-theme";

/** "system" stamps nothing, so prefers-color-scheme keeps deciding. */
function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/**
 * Real radio inputs rather than buttons wearing role="radio": three mutually
 * exclusive choices are what a radio group is, and the browser then supplies
 * arrow-key navigation and the correct announcement for free.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Choice | null;
    if (stored === "light" || stored === "dark") {
      setChoice(stored);
      apply(stored);
    }
  }, []);

  const pick = (next: Choice) => {
    setChoice(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // A private window can refuse storage; the choice still holds this session.
    }
  };

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
            onChange={() => pick(option.value)}
            className="sr-only"
          />
          <option.icon className="size-3.5" aria-hidden />
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
