import { FeesNav } from "./fees-nav";
import { HelpButton } from "@/components/help/help-button";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Fees" };

export default function FeesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Fees</h1>
          <p className="mt-1 text-muted">
            Structures, vouchers and manually recorded payments — amounts in
            your organization&apos;s configured currency, straight from the
            backend. There is no online payment gateway in this phase.
          </p>
        </div>
        <HelpButton featureId="fees" featureLabel="Fees" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
        <FeesNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
