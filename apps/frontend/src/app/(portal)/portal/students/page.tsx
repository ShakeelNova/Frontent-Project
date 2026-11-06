import { PageLoading } from "@/components/feedback/page-loading";
import { StudentsDirectory } from "@/components/students/students-directory";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading students…" />}>
      <StudentsDirectory />
    </Suspense>
  );
}
