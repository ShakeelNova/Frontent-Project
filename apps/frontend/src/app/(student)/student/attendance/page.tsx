import { StudentAttendancePanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My attendance" };

export default function Page() {
  return <StudentAttendancePanel />;
}
