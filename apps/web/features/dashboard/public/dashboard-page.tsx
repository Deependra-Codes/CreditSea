import { serverApi } from "@/lib/server-api";
import type { LeadResponse, LoanResponse, PublicUser } from "@lms/contracts";
import type { ModuleName } from "@lms/domain";
import { notFound } from "next/navigation";
import { isModuleName } from "../model/modules";
import { CollectionQueue } from "../ui/collection-queue";
import { DashboardShell } from "../ui/dashboard-shell";
import { DisbursementQueue } from "../ui/disbursement-queue";
import { SalesLeads } from "../ui/sales-leads";
import { SanctionQueue } from "../ui/sanction-queue";

const NO_ACCESS = (
  <p className="rounded-card border border-line bg-canvas px-5 py-10 text-center text-sm text-ink-3">
    Your role does not have access to this module.
  </p>
);

async function moduleContent(module: ModuleName) {
  if (module === "sales") {
    const data = await serverApi<{ leads: LeadResponse[] }>("/api/sales/leads");
    return data ? <SalesLeads leads={data.leads} /> : NO_ACCESS;
  }

  const data = await serverApi<{ loans: LoanResponse[] }>(`/api/${module}/queue`);
  if (!data) return NO_ACCESS;

  if (module === "sanction") return <SanctionQueue loans={data.loans} />;
  if (module === "disbursement") return <DisbursementQueue loans={data.loans} />;
  return <CollectionQueue loans={data.loans} />;
}

export async function DashboardPage({ module }: { module: string }) {
  if (!isModuleName(module)) notFound();

  const session = await serverApi<{ user: PublicUser }>("/api/auth/me");
  if (!session) notFound();

  return (
    <DashboardShell role={session.user.role} current={module}>
      {await moduleContent(module)}
    </DashboardShell>
  );
}
