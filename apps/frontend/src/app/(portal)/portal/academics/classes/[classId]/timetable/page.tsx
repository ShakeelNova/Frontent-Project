import { TimetableView } from "@/components/academics/timetable-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Class timetable" };

export default async function ClassTimetablePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <TimetableView classId={classId} />;
}
