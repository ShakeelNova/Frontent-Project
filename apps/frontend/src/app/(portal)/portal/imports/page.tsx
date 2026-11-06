import { ImportsHub } from "@/components/imports/imports-hub";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Imports" };

export default function ImportsPage() {
  return <ImportsHub />;
}
