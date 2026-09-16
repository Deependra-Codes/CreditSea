"use client";

import { Button } from "@/components/button";
import { Field, inputClass } from "@/components/field";
import { Money } from "@/components/money";
import { type Column, QueueShell } from "@/components/queue-shell";
import { api } from "@/lib/api";
import type { LoanResponse } from "@lms/contracts";
import { rupeesToPaise } from "@lms/domain";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueueAction } from "../model/use-queue-action";
import { loanColumns } from "./loan-columns";
import { LoanDetail } from "./loan-detail";

const today = () => new Date().toISOString().slice(0, 10);

function PaymentForm({ loan }: { loan: LoanResponse }) {
  const { run, busy, error, fieldErrors } = useQueueAction();
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState(String(loan.outstanding));
  const [paidAt, setPaidAt] = useState(today());

  const entered = Number(amount);
  const settles = entered === loan.outstanding;
  const overpays = entered > loan.outstanding;

  const record = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      await api(`/api/collection/${loan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ utr, amount: entered, paidAt }),
      });
      toast.success(settles ? "Loan settled and closed" : "Payment recorded", {
        description: `UTR ${utr} · ₹${entered.toLocaleString("en-IN")}`,
      });
    });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={record}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="UTR" htmlFor={`utr-${loan.id}`} error={fieldErrors.utr}>
          <input
            id={`utr-${loan.id}`}
            required
            minLength={6}
            value={utr}
            onChange={(event) => setUtr(event.target.value.toUpperCase())}
            className={`${inputClass} font-mono uppercase`}
          />
        </Field>

        <Field
          label="Amount (₹)"
          htmlFor={`amt-${loan.id}`}
          error={fieldErrors.amount}
          hint={settles ? "Settles the loan — it will close" : undefined}
        >
          <input
            id={`amt-${loan.id}`}
            type="number"
            min={1}
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={`${inputClass} font-mono tabular-nums`}
          />
        </Field>

        <Field label="Paid on" htmlFor={`date-${loan.id}`} error={fieldErrors.paidAt}>
          <input
            id={`date-${loan.id}`}
            type="date"
            required
            max={today()}
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {/* The server is the authority; this only saves a round trip. */}
      {overpays && (
        <p className="text-xs text-critical">
          That is more than the outstanding balance of{" "}
          <Money paise={rupeesToPaise(loan.outstanding)} />.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy || overpays} className="self-start">
        {busy ? "Recording…" : settles ? "Record final payment" : "Record payment"}
      </Button>
    </form>
  );
}

export function CollectionQueue({ loans }: { loans: LoanResponse[] }) {
  const outstanding: Column<LoanResponse> = {
    key: "outstanding",
    header: "Outstanding",
    align: "right",
    render: (loan) => <Money paise={rupeesToPaise(loan.outstanding)} />,
  };

  const owed = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const settled = loans.filter((loan) => loan.outstanding < loan.totalRepayable).length;

  return (
    <QueueShell
      title="Collection"
      subtitle="Active loans. Record a payment; the loan closes itself once it is settled."
      tiles={[
        { label: "Active loans", value: String(loans.length) },
        { label: "Part paid", value: String(settled) },
        { label: "Outstanding", value: `₹${(owed / 100_000).toFixed(2)}L` },
      ]}
      rows={loans}
      columns={[...loanColumns, outstanding]}
      getRowId={(loan) => loan.id}
      searchText={(loan) => `${loan.applicantName} ${loan.pan}`}
      empty={{
        icon: Wallet,
        title: "No active loans",
        body: "Loans arrive here once disbursement releases the funds.",
      }}
      renderDetail={(loan) => (
        <LoanDetail loan={loan}>
          {/* Keyed on the balance: once a payment lands this form is about a
              different amount, so it starts fresh rather than holding a spent
              UTR and the old outstanding. */}
          <PaymentForm key={loan.outstanding} loan={loan} />
        </LoanDetail>
      )}
    />
  );
}
