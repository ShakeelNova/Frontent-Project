import { AdminOverview } from "@/components/admin/overview";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform admin overview" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Platform overview</h1>
        <p className="mt-1 text-muted">
          Catalogue health, supply and margin risk, and recent changes.
          Everything here is Fluxeaze-internal.
        </p>
      </div>
      <AdminOverview />
    </div>
  );
}
