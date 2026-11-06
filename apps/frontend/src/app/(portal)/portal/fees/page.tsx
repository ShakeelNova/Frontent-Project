import { FeesOverview } from "@/components/fees/fees-overview";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Fees overview" };

export default function FeesPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading fees…" />}>
      <FeesOverview />
    </Suspense>
  );
}
