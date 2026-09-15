"use client";

import { LiveLoanCard } from "@/components/live-loan-card";
import { MeshBackdrop } from "@/components/mesh-backdrop";
import { BadgeIndianRupee, CalendarRange, Percent } from "lucide-react";
import { useState } from "react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

export type AuthMode = "signin" | "register";

const TERMS = [
  { icon: BadgeIndianRupee, label: "Amount", value: "₹50K – ₹5L" },
  { icon: CalendarRange, label: "Tenure", value: "30 – 365 days" },
  { icon: Percent, label: "Interest", value: "12% p.a." },
] as const;

const COPY = {
  signin: {
    title: "Sign in",
    subtitle: "Borrowers apply and track their loan. Executives work their module.",
    switchPrompt: "New here?",
    switchLabel: "Create a borrower account",
    path: "/login",
  },
  register: {
    title: "Create your account",
    subtitle: "Four steps: your details, an eligibility check, your salary slip, then your loan.",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    path: "/register",
  },
} as const;

/**
 * One screen, two modes. Switching slides the two halves past each other rather
 * than navigating, because a full page load between sign-in and register throws
 * away what the visitor was already reading on the left.
 *
 * Both routes still render server-side, so a direct load or a bookmark works;
 * the URL is corrected in place when the mode changes.
 */
export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const copy = COPY[mode];
  const registering = mode === "register";

  const switchTo = (next: AuthMode) => {
    setMode(next);
    window.history.replaceState(null, "", COPY[next].path);
  };

  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-2">
      {/* ── the product half ── */}
      <aside
        className={[
          "relative hidden overflow-hidden bg-canvas",
          "lg:flex lg:flex-col lg:justify-center lg:gap-7 lg:p-12 lg:pb-10",
          "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          registering ? "lg:translate-x-full" : "lg:translate-x-0",
        ].join(" ")}
      >
        <MeshBackdrop />

        <div className="relative flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
            Lending Portal
          </span>
          <h2 className="max-w-md text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Four steps to a loan, and four hands that move it.
          </h2>
        </div>

        <div className="relative">
          <LiveLoanCard />
        </div>

        <dl className="relative grid grid-cols-3 gap-3">
          {TERMS.map((term) => (
            <div
              key={term.label}
              className="flex flex-col gap-1 rounded-card bg-surface/70 px-3 py-2.5 ring-1 ring-line-soft backdrop-blur-sm"
            >
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
                <term.icon className="size-3.5" aria-hidden />
                {term.label}
              </dt>
              <dd className="text-xs font-bold">{term.value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* ── the form half ── */}
      <main
        className={[
          "flex items-center justify-center px-5 py-12",
          "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          registering ? "lg:-translate-x-full" : "lg:translate-x-0",
        ].join(" ")}
      >
        {/* keyed on mode, so the contents cross-fade while the halves slide */}
        <div key={mode} className="enter flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent lg:hidden">
              Lending Portal
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance">{copy.title}</h1>
            <p className="text-sm text-ink-2">{copy.subtitle}</p>
          </div>

          <div className="rounded-card bg-canvas p-6 ring-1 ring-line">
            {registering ? <RegisterForm /> : <LoginForm />}
          </div>

          <p className="text-sm text-ink-2">
            {copy.switchPrompt}{" "}
            <button
              type="button"
              onClick={() => switchTo(registering ? "signin" : "register")}
              className="font-bold text-accent underline-offset-4 hover:underline"
            >
              {copy.switchLabel}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
