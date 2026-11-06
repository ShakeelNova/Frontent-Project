import { AddonsPanel } from "@/components/admin/addons-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add-ons — platform admin" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Add-ons</h1>
        <p className="mt-1 text-muted">
          Extra capacity and modules sold on top of plans, versioned and
          published the same way.
        </p>
      </div>
      <AddonsPanel />
    </div>
  );
}
