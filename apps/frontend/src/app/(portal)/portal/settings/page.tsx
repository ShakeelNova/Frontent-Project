import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "./profile-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organization profile" };

export default function SettingsProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organization profile"
        description="Shown across portals, receipts and communications."
      />
      <ProfileForm />
    </div>
  );
}
