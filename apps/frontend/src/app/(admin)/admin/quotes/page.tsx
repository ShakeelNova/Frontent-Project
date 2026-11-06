import { QuotesPanel } from "@/components/admin/quotes-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enterprise quotes — platform admin" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Enterprise quotes</h1>
        <p className="mt-1 text-muted">
          Custom offers and the rules that produce them. Conversion
          activates the quoted snapshot — nothing is auto-upgraded.
        </p>
      </div>
      <QuotesPanel />
    </div>
  );
}
