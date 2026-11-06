import { PageLoading } from "@/components/feedback/page-loading";
import { StaffDirectory } from "@/components/staff/staff-directory";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading staff…" />}>
      <StaffDirectory />
    </Suspense>
  );
}
