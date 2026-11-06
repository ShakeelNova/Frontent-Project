import { PortalGate } from "@/components/layout/portal-gate";
import { PortalShell } from "@/components/layout/portal-shell";
import type { ReactNode } from "react";

/**
 * Authenticated organization portal (owners/managers/staff).
 * PortalGate bootstraps the session (/auth/me) + tenant context and
 * redirects unauth/unscoped users; backend authorizes every API call.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell>
      <PortalGate>{children}</PortalGate>
    </PortalShell>
  );
}
