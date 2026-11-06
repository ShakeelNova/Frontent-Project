import { RequestsPanel } from "@/components/attendance/requests-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Corrections & leave" };

export default function AttendanceRequestsPage() {
  return <RequestsPanel />;
}
