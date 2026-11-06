import { StudentFeesPanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My fees" };

export default function Page() {
  return <StudentFeesPanel />;
}
