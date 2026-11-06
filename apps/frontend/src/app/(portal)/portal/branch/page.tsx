import { BranchPageClient } from "./branch-page-client";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Branch dashboard" };

export default function BranchDashboardPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading branch dashboard…" />}>
      <BranchPageClient />
    </Suspense>
  );
}
