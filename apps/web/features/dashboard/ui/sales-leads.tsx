"use client";

import { type Column, QueueShell } from "@/components/queue-shell";
import type { LeadResponse } from "@lms/contracts";
import type { LeadStage } from "@lms/domain";

const STAGE: Record<LeadStage, { label: string; dot: string; tone: string }> = {
  SIGNED_UP: { label: "Signed up", dot: "bg-line-2", tone: "text-ink-3" },
  DETAILS_STARTED: { label: "Details started", dot: "bg-stage-1", tone: "text-ink-2" },
  NOT_ELIGIBLE: { label: "Not eligible", dot: "bg-critical", tone: "text-critical" },
  READY_TO_APPLY: { label: "Ready to apply", dot: "bg-good", tone: "text-ink" },
  APPLIED: { label: "Applied", dot: "bg-stage-3", tone: "text-ink-2" },
};

const columns: Column<LeadResponse>[] = [
  { key: "name", header: "Name", render: (lead) => lead.fullName },
  {
    key: "email",
    header: "Email",
    secondary: true,
    render: (lead) => <span className="font-mono text-xs">{lead.email}</span>,
  },
  {
    key: "pan",
    header: "PAN",
    secondary: true,
    render: (lead) => <span className="font-mono">{lead.pan ?? "—"}</span>,
  },
  {
    key: "stage",
    header: "Stage",
    render: (lead) => {
      const stage = STAGE[lead.stage];
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${stage.tone}`}>
          <span className={`size-[7px] shrink-0 rounded-full ${stage.dot}`} />
          {stage.label}
        </span>
      );
    },
  },
];

export function SalesLeads({ leads }: { leads: LeadResponse[] }) {
  const count = (stage: LeadStage) => leads.filter((lead) => lead.stage === stage).length;

  return (
    <QueueShell
      title="Sales"
      subtitle="Registered borrowers and where each one sits before applying."
      tiles={[
        { label: "Leads", value: String(leads.length) },
        { label: "Ready to apply", value: String(count("READY_TO_APPLY")) },
        { label: "Not eligible", value: String(count("NOT_ELIGIBLE")) },
        { label: "Converted", value: String(count("APPLIED")) },
      ]}
      rows={leads}
      columns={columns}
      getRowId={(lead) => lead.id}
      emptyMessage="No borrowers have registered yet."
    />
  );
}
