import { isMockTransport } from "@/api/transport";
import { Alert } from "@/components/ui/alert";
import type { ReactNode } from "react";

/**
 * Dev-only scenario hints, rendered ONLY under the mock transport so the
 * team can exercise success/error branches deterministically. Never ships
 * to real users (mock transport must not be enabled in production).
 */
export function MockHint({ children }: { children: ReactNode }) {
  if (!isMockTransport()) return null;
  return (
    <Alert variant="warning" title="Dev mock API — try these scenarios">
      <div className="text-sm text-muted">{children}</div>
    </Alert>
  );
}
