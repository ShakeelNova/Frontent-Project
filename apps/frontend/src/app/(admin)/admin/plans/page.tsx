import { PlansList } from "@/components/admin/plans-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plans & versions — platform admin" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Plans & versions</h1>
        <p className="mt-1 text-muted">
          The subscription catalogue (USD). Only published versions reach the
          public pricing page; existing subscriptions always keep the
          snapshot they were sold.
        </p>
      </div>
      <PlansList />
    </div>
  );
}
