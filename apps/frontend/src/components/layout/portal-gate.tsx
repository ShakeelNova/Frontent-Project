"use client";

import { routes } from "@/lib/routes";

import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { useTenant } from "@/components/tenant/tenant-provider";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Portal route protection (layout-level). Middleware can't validate an
 * HttpOnly-cookie session without a backend round-trip per request, so the
 * portal bootstraps client-side via /auth/me (useAuth) + tenant context:
 * unauth → /auth/sign-in?next=… · multi-org w/o selection or 0 orgs →
 * /auth/organizations. This is UX gating only — the backend authorizes
 * every API call (401/403 are handled by each screen's error states).
 */
export function PortalGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const tenant = useTenant();
  const router = useRouter();
  const pathname = usePathname();

  const needsChooser =
    Boolean(user) && (tenant.hasNoOrganizations || tenant.needsOrgSelection);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const next = encodeURIComponent(pathname || "/portal");
      router.replace(routes.auth.signInNext(next));
      return;
    }
    if (user.kind !== "staff" || user.isPlatformAdmin) return; // panels below
    if (needsChooser) router.replace(routes.auth.organizations);
  }, [isLoading, user, needsChooser, pathname, router]);

  if (isLoading || (user && tenant.isLoadingOrganizations)) {
    return <PageLoading label="Loading your portal…" />;
  }
  if (!user) {
    return <PageLoading label="Redirecting…" />;
  }
  if (user.isPlatformAdmin) {
    // Platform admins hold no tenant memberships; internal tooling lives
    // in the admin area (tenant APIs 403 this session regardless).
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-h3">This area is for organization staff</h1>
        <p className="mt-2 text-muted">
          You&apos;re signed in as a Fluxeaze platform administrator. Plan
          catalogues, rates, quotes and audit tools live in the platform
          admin area.
        </p>
        <p className="mt-4">
          <a href={routes.admin.root} className="font-medium text-primary underline">
            Go to platform admin →
          </a>
        </p>
      </main>
    );
  }
  if (user.kind !== "staff") {
    // Students/guardians never see management tooling (UX mirror of the
    // backend's 403s — every admin API rejects their session anyway).
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-h3">This area is for school staff</h1>
        <p className="mt-2 text-muted">
          You&apos;re signed in as a {user.kind}. Your attendance, timetable,
          fees and results live in the student &amp; parent area.
        </p>
        <p className="mt-4">
          <a href={routes.student.root} className="font-medium text-primary underline">
            Go to the student &amp; parent area →
          </a>
        </p>
      </main>
    );
  }
  if (needsChooser) {
    return <PageLoading label="Redirecting…" />;
  }
  if (tenant.organizationsError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <ErrorState
          error={tenant.organizationsError}
          onRetry={tenant.refetchOrganizations}
        />
      </main>
    );
  }
  return <>{children}</>;
}
