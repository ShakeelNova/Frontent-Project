import { AcademicYearForm } from "./academic-year-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academic year" };

export default function SettingsAcademicYearPage() {
  return (
    <section aria-labelledby="academic-year-heading">
      <h2 id="academic-year-heading" className="text-h4">
        Academic year basics
      </h2>
      <div className="mt-5">
        <AcademicYearForm />
      </div>
    </section>
  );
}
