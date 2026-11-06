import { PricingPlans } from "./pricing-plans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Fluxeaze plans for schools, colleges, academies and institutes — published pricing and resource allowances.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <p className="text-caption font-semibold tracking-wide text-secondary uppercase">
        Pricing
      </p>
      <h1 className="mt-2">Plans that grow with your institute</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Subscription pricing in USD with clear resource allowances — students,
        storage, email and more. Your fee collections always stay in your
        organization&apos;s own currency.
      </p>
      <div className="mt-10">
        <PricingPlans />
      </div>
      <p className="mt-8 text-sm text-muted">
        Allowances are shown exactly as published. Capacity warnings appear in
        the product as you approach limits — reaching a limit never locks you
        out of your existing records.
      </p>
    </div>
  );
}
