import { SubscriptionView } from "@/components/billing/subscription-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing & subscription" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Billing & subscription</h1>
        <p className="mt-1 text-muted">
          Your Fluxeaze plan, capacity and subscription history — prices and
          allowances straight from the backend (USD catalogue). Pilot plans
          are managed by the Fluxeaze team; there is no online checkout.
        </p>
      </div>
      <SubscriptionView />
    </div>
  );
}
