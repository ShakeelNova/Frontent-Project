import { StudentNoticesPanel } from "@/components/student-portal/student-portal-panels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notices" };

export default function Page() {
  return <StudentNoticesPanel />;
}
