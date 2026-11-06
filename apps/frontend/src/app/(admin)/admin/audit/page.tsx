import { AuditPanel } from "@/components/admin/audit-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit history — platform admin" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Audit history</h1>
        <p className="mt-1 text-muted">
          Every catalogue, add-on and quote change — who made it, what
          changed, and when. Times are stored in UTC by the backend.
        </p>
      </div>
      <AuditPanel />
    </div>
  );
}
