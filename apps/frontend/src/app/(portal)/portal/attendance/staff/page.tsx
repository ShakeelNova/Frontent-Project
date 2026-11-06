import { StaffAttendancePanel } from "@/components/attendance/staff-attendance-panel";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Staff attendance" };

export default function StaffAttendancePage() {
  return (
    <Suspense fallback={<PageLoading label="Loading staff attendance…" />}>
      <StaffAttendancePanel />
    </Suspense>
  );
}
