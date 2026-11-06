import { StudentResultsPanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My results" };

export default function Page() {
  return <StudentResultsPanel />;
}
