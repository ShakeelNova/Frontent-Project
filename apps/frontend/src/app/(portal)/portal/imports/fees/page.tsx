import { routes } from "@/lib/routes";
import { ImportWizard } from "@/components/imports/import-wizard";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Import fee vouchers" };

export default function ImportFeesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p>
        <Link href={routes.portal.imports} className="text-sm font-medium text-primary underline">
          ← All imports
        </Link>
      </p>
      <h1 className="mt-2">Import fee vouchers</h1>
      <p className="mt-1 text-muted">
        One voucher per row, matched by student code. Amounts are in your
        organization&apos;s currency (major units, e.g. 16000).
      </p>
      <div className="mt-6">
        <ImportWizard kind="fees" />
      </div>
    </div>
  );
}
