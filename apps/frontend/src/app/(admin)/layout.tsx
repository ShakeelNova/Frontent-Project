import { AdminShell } from "@/components/admin/admin-shell";
import type { ReactNode } from "react";

/**
 * Platform admin — visually distinct from organization-facing surfaces.
 * Internal cost/margin/rate data renders here ONLY, and only for platform
 * admins as enforced by the backend on every call (AdminShell is the UX
 * gate; it is not the security boundary).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
