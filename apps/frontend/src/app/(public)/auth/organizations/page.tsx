import { OrgChooser } from "./org-chooser";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Choose organization" };

export default function OrganizationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1>Choose your organization</h1>
      <p className="mt-2 text-muted">
        Each organization is its own secure workspace — branches, students and
        fees never mix across organizations.
      </p>
      <div className="mt-8">
        <OrgChooser />
      </div>
    </div>
  );
}
