"use client";

import { Button } from "@/components/button";
import { QueueShell } from "@/components/queue-shell";
import { ApiClientError, api } from "@/lib/api";
import type { LoanResponse } from "@lms/contracts";
import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { loanColumns, waitingTiles } from "./loan-columns";
import { LoanDetail } from "./loan-detail";

function Release({ loan }: { loan: LoanResponse }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function release() {
    setPending(true);
    setError(null);
    try {
      await api(`/api/disbursement/${loan.id}/release`, { method: "POST" });
      toast.success("Funds released", { description: `${loan.applicantName} · ${loan.pan}` });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">
        Releasing funds moves this loan to disbursed and opens it for collection.
      </p>

      {error && (
        <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={pending}
        onClick={() => void release()}
        className="self-start"
      >
        {pending ? "Releasing…" : "Mark as disbursed"}
      </Button>
    </div>
  );
}

export function DisbursementQueue({ loans }: { loans: LoanResponse[] }) {
  return (
    <QueueShell
      title="Disbursement"
      subtitle="Sanctioned loans waiting for funds to be released."
      tiles={waitingTiles(loans, (loan) => loan.sanctionedAt ?? loan.appliedAt)}
      rows={loans}
      columns={loanColumns}
      getRowId={(loan) => loan.id}
      empty={{
        icon: Banknote,
        title: "Nothing to disburse",
        body: "Loans arrive here once the sanction team approves them.",
      }}
      renderDetail={(loan) => (
        <LoanDetail loan={loan}>
          <Release loan={loan} />
        </LoanDetail>
      )}
    />
  );
}
