import { AdminOverview } from "@/components/admin/overview";
import { PageHeader } from "@/components/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform admin overview" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fluxeaze Platform"
        title="Platform overview"
        description="Catalogue health, supply and margin risk, and recent changes. Everything here is Fluxeaze-internal."
      />
      <AdminOverview />
    </div>
  );
}
