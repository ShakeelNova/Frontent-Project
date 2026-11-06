import { OrgDashboard } from "./org-dashboard";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Dashboard" };

export default function PortalDashboardPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading dashboard…" />}>
      <OrgDashboard />
    </Suspense>
  );
}
