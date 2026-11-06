import { SubjectsPanel } from "@/components/academics/subjects-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Subjects" };

export default function AcademicsSubjectsPage() {
  return <SubjectsPanel />;
}
