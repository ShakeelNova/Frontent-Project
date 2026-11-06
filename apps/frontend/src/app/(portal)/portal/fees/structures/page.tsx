import { StructuresPanel } from "@/components/fees/structures-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fee structures" };

export default function FeeStructuresPage() {
  return <StructuresPanel />;
}
