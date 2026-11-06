import { ProfileForm } from "./profile-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organization profile" };

export default function SettingsProfilePage() {
  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="text-h4">
        Organization profile
      </h2>
      <p className="mt-1 text-sm text-muted">
        Shown across portals, receipts and communications.
      </p>
      <div className="mt-5">
        <ProfileForm />
      </div>
    </section>
  );
}
