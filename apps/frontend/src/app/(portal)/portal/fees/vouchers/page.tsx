import { VouchersPanel } from "@/components/fees/vouchers-panel";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Vouchers" };

export default function VouchersPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading vouchers…" />}>
      <VouchersPanel />
    </Suspense>
  );
}
