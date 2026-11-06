import { ProgramsPanel } from "@/components/academics/programs-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Programs" };

export default function AcademicsProgramsPage() {
  return <ProgramsPanel />;
}
