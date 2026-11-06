import { routes } from "@/lib/routes";
import { ImportWizard } from "@/components/imports/import-wizard";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Import staff" };

export default function ImportStaffPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p>
        <Link href={routes.portal.imports} className="text-sm font-medium text-primary underline">
          ← All imports
        </Link>
      </p>
      <h1 className="mt-2">Import staff</h1>
      <p className="mt-1 text-muted">
        Each row becomes a staff invitation with the mapped role — people
        accept via their invite link as usual.
      </p>
      <div className="mt-6">
        <ImportWizard kind="staff" />
      </div>
    </div>
  );
}
