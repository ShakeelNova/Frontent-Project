import { StudentTimetablePanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My timetable" };

export default function Page() {
  return <StudentTimetablePanel />;
}
