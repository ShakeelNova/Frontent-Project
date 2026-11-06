import { PilotForm } from "./pilot-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a pilot",
  description:
    "Request a Fluxeaze pilot or an enterprise quote for your school, academy or institute.",
};

export default function RequestPilotPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-caption font-semibold tracking-wide text-secondary uppercase">
        Early access
      </p>
      <h1 className="mt-2">Request a pilot</h1>
      <p className="mt-3 text-muted">
        Pilots run with a small number of institutes each term so onboarding
        stays personal. Tell us about your organization and we&apos;ll follow up
        with next steps — including an enterprise quote if you need custom
        capacity.
      </p>
      <div className="mt-8">
        <PilotForm />
      </div>
    </div>
  );
}
