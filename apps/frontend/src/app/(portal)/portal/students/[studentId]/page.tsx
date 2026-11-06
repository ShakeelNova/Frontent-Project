import { StudentDetailView } from "@/components/students/student-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student details" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentDetailView studentId={studentId} />;
}
