import { DashboardPage } from "@/features/dashboard/public";

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <DashboardPage module={module} />;
}
