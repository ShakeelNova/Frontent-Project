import { BranchesPanel } from "./branches-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Branches" };

export default function SettingsBranchesPage() {
  return (
    <section aria-labelledby="branches-heading">
      <h2 id="branches-heading" className="text-h4">
        Branches
      </h2>
      <p className="mt-1 text-sm text-muted">
        Branches you can access. Branch managers only ever see their
        authorized branches here.
      </p>
      <div className="mt-5">
        <BranchesPanel />
      </div>
    </section>
  );
}
