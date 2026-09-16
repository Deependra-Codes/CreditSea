import { DashboardLayout } from "@/features/dashboard/public";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
