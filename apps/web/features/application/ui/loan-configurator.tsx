"use client";

import { AnimatedMoney } from "@/components/animated-money";
import { Button } from "@/components/button";
import { ApiClientError, api } from "@/lib/api";
import type { LoanResponse } from "@lms/contracts";
import {
  MAX_PRINCIPAL_PAISE,
  MAX_TENURE_DAYS,
  MIN_PRINCIPAL_PAISE,
  MIN_TENURE_DAYS,
  paiseToRupees,
  quoteLoan,
  rupeesToPaise,
} from "@lms/domain";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RepaymentBar } from "./repayment-bar";

const MIN_RUPEES = paiseToRupees(MIN_PRINCIPAL_PAISE);
const MAX_RUPEES = paiseToRupees(MAX_PRINCIPAL_PAISE);
const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function LoanConfigurator() {
  const router = useRouter();
  const [amount, setAmount] = useState(MIN_RUPEES);
  const [tenureDays, setTenureDays] = useState(MIN_TENURE_DAYS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The same function the API stores with, so the figure on screen is the
  // figure in the ledger.
  const quote = quoteLoan(rupeesToPaise(amount), tenureDays);

  async function apply() {
    setPending(true);
    setError(null);
    try {
      await api<{ loan: LoanResponse }>("/api/loans", {
        method: "POST",
        body: JSON.stringify({ amount, tenureDays }),
      });
      toast.success("Application submitted", {
        description: "Your loan is now with the sanction team.",
      });
      router.replace("/apply/status");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="amount" className="text-xs font-medium text-ink-2">
              Loan amount
            </label>
            <span className="font-mono text-xl font-semibold tabular-nums">{inr(amount)}</span>
          </div>
          <input
            id="amount"
            type="range"
            min={MIN_RUPEES}
            max={MAX_RUPEES}
            step={1000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="h-6 w-full accent-accent"
          />
          <div className="flex justify-between font-mono text-[11px] text-ink-3">
            <span>{inr(MIN_RUPEES)}</span>
            <span>{inr(MAX_RUPEES)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="tenure" className="text-xs font-medium text-ink-2">
              Tenure
            </label>
            <span className="font-mono text-xl font-semibold tabular-nums">{tenureDays} days</span>
          </div>
          <input
            id="tenure"
            type="range"
            min={MIN_TENURE_DAYS}
            max={MAX_TENURE_DAYS}
            step={1}
            value={tenureDays}
            onChange={(event) => setTenureDays(Number(event.target.value))}
            className="h-6 w-full accent-accent"
          />
          <div className="flex justify-between font-mono text-[11px] text-ink-3">
            <span>{MIN_TENURE_DAYS} days</span>
            <span>{MAX_TENURE_DAYS} days</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-canvas p-5 ring-1 ring-line">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Total repayment
          </span>
          <AnimatedMoney
            paise={quote.totalRepayablePaise}
            className="text-[clamp(2.4rem,7vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.04em]"
          />
        </div>

        <RepaymentBar principalPaise={quote.principalPaise} interestPaise={quote.interestPaise} />

        <p className="text-xs text-ink-3">
          {quote.interestRateBps / 100}% p.a. simple interest ·{" "}
          <span className="font-mono">
            {amount.toLocaleString("en-IN")} × {quote.interestRateBps / 100} × {tenureDays} ÷ 36,500
          </span>
        </p>

        {error && (
          <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
            {error}
          </p>
        )}

        <Button type="button" disabled={pending} onClick={() => void apply()} className="w-full">
          {pending ? "Submitting…" : "Apply for this loan"}
          {!pending && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
