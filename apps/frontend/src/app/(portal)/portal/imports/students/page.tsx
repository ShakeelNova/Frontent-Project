import { routes } from "@/lib/routes";
import { ImportWizard } from "@/components/imports/import-wizard";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Import students" };

export default function ImportStudentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p>
        <Link href={routes.portal.imports} className="text-sm font-medium text-primary underline">
          ← All imports
        </Link>
      </p>
      <h1 className="mt-2">Import students</h1>
      <p className="mt-1 text-muted">
        Students are created as active records — capacity rules still apply,
        and enrollments can be added afterwards from each student&apos;s
        profile.
      </p>
      <div className="mt-6">
        <ImportWizard kind="students" />
      </div>
    </div>
  );
}
