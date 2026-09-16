import { EmptyState } from "@/components/empty-state";
import { serverApi } from "@/lib/server-api";
import type { LeadResponse, LoanResponse, OverviewResponse } from "@lms/contracts";
import type { ModuleName } from "@lms/domain";
import { ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { type DashboardSection, OVERVIEW, isSection } from "../model/modules";
import { CollectionQueue } from "../ui/collection-queue";
import { DisbursementQueue } from "../ui/disbursement-queue";
import { Overview } from "../ui/overview";
import { SalesLeads } from "../ui/sales-leads";
import { SanctionQueue } from "../ui/sanction-queue";

const NO_ACCESS = (
  <EmptyState
    icon={ShieldAlert}
    title="Not your module"
    body="Your role does not have access to this section. The API refuses it too, not just the menu."
  />
);

async function sectionContent(section: DashboardSection) {
  if (section === OVERVIEW) {
    const data = await serverApi<OverviewResponse>("/api/overview");
    return data ? <Overview data={data} /> : NO_ACCESS;
  }

  if (section === "sales") {
    const data = await serverApi<{ leads: LeadResponse[] }>("/api/sales/leads");
    return data ? <SalesLeads leads={data.leads} /> : NO_ACCESS;
  }

  const data = await serverApi<{ loans: LoanResponse[] }>(
    `/api/${section satisfies ModuleName}/queue`,
  );
  if (!data) return NO_ACCESS;

  if (section === "sanction") return <SanctionQueue loans={data.loans} />;
  if (section === "disbursement") return <DisbursementQueue loans={data.loans} />;
  return <CollectionQueue loans={data.loans} />;
}

export async function DashboardPage({ module }: { module: string }) {
  if (!isSection(module)) notFound();
  // The shell and the session live in the layout, so this renders only its section.
  return sectionContent(module);
}
