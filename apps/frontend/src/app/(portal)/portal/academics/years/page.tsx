import { YearsPanel } from "@/components/academics/years-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academic years" };

export default function AcademicsYearsPage() {
  return <YearsPanel />;
}
