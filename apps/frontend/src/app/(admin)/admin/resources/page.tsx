import { ResourcesRates } from "@/components/admin/resources-rates";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resources & rates — platform admin" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Resources & rates</h1>
        <p className="mt-1 text-muted">
          What a unit is, what it costs us, and how close each supply pool
          and plan margin is to its risk threshold.
        </p>
      </div>
      <ResourcesRates />
    </div>
  );
}
