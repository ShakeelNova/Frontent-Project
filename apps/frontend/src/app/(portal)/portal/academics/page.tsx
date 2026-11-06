import { YearsPanel } from "@/components/academics/years-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academic structure" };

/** Lands on Academic years (the first structure step). */
export default function AcademicsIndexPage() {
  return <YearsPanel />;
}
