import { StudentsDaily } from "@/components/attendance/students-daily";
import { PageLoading } from "@/components/feedback/page-loading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Student attendance" };

export default function StudentAttendancePage() {
  return (
    <Suspense fallback={<PageLoading label="Loading attendance…" />}>
      <StudentsDaily />
    </Suspense>
  );
}
