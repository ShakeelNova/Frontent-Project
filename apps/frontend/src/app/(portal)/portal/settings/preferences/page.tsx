import { PreferencesForm } from "./preferences-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Timezone & currency" };

export default function SettingsPreferencesPage() {
  return (
    <section aria-labelledby="preferences-heading">
      <h2 id="preferences-heading" className="text-h4">
        Timezone &amp; currency
      </h2>
      <div className="mt-5">
        <PreferencesForm />
      </div>
    </section>
  );
}
