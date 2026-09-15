"use client";

import { Button } from "@/components/button";
import { QueueShell } from "@/components/queue-shell";
import { ApiClientError, api } from "@/lib/api";
import type { LoanResponse } from "@lms/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loanColumns, waitingTiles } from "./loan-columns";
import { LoanDetail } from "./loan-detail";

function Decision({ loan }: { loan: LoanResponse }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT") {
    setPending(decision);
    setError(null);
    try {
      await api(`/api/sanction/${loan.id}/decide`, {
        method: "POST",
        body: JSON.stringify(decision === "REJECT" ? { decision, reason } : { decision }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not reach the server.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`reason-${loan.id}`} className="text-xs font-medium text-ink-2">
          Reason — required to reject
        </label>
        <input
          id={`reason-${loan.id}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Salary slip does not match the declared income"
          className="w-full rounded-ctrl border border-line-2 bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending !== null} onClick={() => void decide("APPROVE")}>
          {pending === "APPROVE" ? "Approving…" : "Approve loan"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending !== null || reason.trim().length < 3}
          onClick={() => void decide("REJECT")}
        >
          {pending === "REJECT" ? "Rejecting…" : "Reject with reason"}
        </Button>
      </div>
    </div>
  );
}

export function SanctionQueue({ loans }: { loans: LoanResponse[] }) {
  return (
    <QueueShell
      title="Sanction"
      subtitle="Applications waiting on an approve or reject decision."
      tiles={waitingTiles(loans, (loan) => loan.appliedAt)}
      rows={loans}
      columns={loanColumns}
      getRowId={(loan) => loan.id}
      emptyMessage="Nothing waiting. New applications land here as borrowers apply."
      renderDetail={(loan) => (
        <LoanDetail loan={loan}>
          <Decision loan={loan} />
        </LoanDetail>
      )}
    />
  );
}
