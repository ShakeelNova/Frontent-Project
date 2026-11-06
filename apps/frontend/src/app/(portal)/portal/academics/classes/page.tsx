import { ClassesPanel } from "@/components/academics/classes-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Classes & batches" };

export default function AcademicsClassesPage() {
  return <ClassesPanel />;
}
