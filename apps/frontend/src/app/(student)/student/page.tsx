import { StudentHomePanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student & parent home" };

export default function StudentHomePage() {
  return <StudentHomePanel />;
}
