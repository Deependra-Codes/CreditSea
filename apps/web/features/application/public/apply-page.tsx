import { serverApi } from "@/lib/server-api";
import type { ApplicationResponse } from "@lms/contracts";
import { redirect } from "next/navigation";
import { Wizard } from "../ui/wizard";

const EMPTY: ApplicationResponse = { profile: null, activeLoan: null };

export async function ApplyPage() {
  const application = (await serverApi<ApplicationResponse>("/api/application/me")) ?? EMPTY;

  // One active loan at a time, so there is nothing to configure while one runs.
  if (application.activeLoan) redirect("/apply/status");

  return <Wizard initial={application} />;
}
