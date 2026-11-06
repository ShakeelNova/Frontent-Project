"use client";

import { routes } from "@/lib/routes";

import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Organization chooser / switcher (post-sign-in landing):
 * 0 orgs → clear message · 1 org → auto-continue · many → pick a card.
 * Also reachable later for switching (current org is badged).
 */
export function OrgChooser() {
  const { user, isLoading, signOut, isSigningOut } = useAuth();
  const tenant = useTenant();
  const router = useRouter();
  const { organizations, currentOrganization } = tenant;

  useEffect(() => {
    if (!isLoading && !user) router.replace(routes.auth.signIn);
    // Platform admins have no tenant organizations — their home is the
    // internal admin area.
    if (!isLoading && user?.isPlatformAdmin) router.replace(routes.admin.root);
    // Students/guardians have no organizations to choose — their home is
    // the student/parent area.
    if (!isLoading && user && user.kind !== "staff") router.replace(routes.student.root);
  }, [isLoading, user, router]);

  // Single organization: provider auto-selects → continue straight in.
  useEffect(() => {
    if (organizations.length === 1 && currentOrganization) {
      router.replace(routes.portal.root);
    }
  }, [organizations.length, currentOrganization, router]);

  if (isLoading || (user && tenant.isLoadingOrganizations)) {
    return <PageLoading label="Loading your organizations…" className="min-h-40 py-8" />;
  }
  if (!user) return <PageLoading label="Redirecting…" className="min-h-40 py-8" />;

  if (tenant.organizationsError) {
    return (
      <ErrorState
        error={tenant.organizationsError}
        onRetry={tenant.refetchOrganizations}
      />
    );
  }

  if (tenant.hasNoOrganizations) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="warning" title="No organizations assigned yet">
          Your account ({user.email}) isn&apos;t connected to an organization.
          If you were invited, open the invite link from your email — or
          contact your institute&apos;s administrator (or the Fluxeaze team) to
          be added.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="subtle"
            isLoading={isSigningOut}
            onClick={async () => {
              await signOut().catch(() => undefined);
              router.push(routes.auth.signIn);
            }}
          >
            Sign out
          </Button>
          <Button onClick={() => router.push(routes.requestPilot)}>
            Request a pilot instead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-text">{user.fullName}</span>{" "}
        ({user.email}). Choose an organization to open its portal — you can
        switch anytime from the top bar.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {organizations.map((org) => {
          const isCurrent = currentOrganization?.id === org.id;
          return (
            <li key={org.id}>
              <button
                type="button"
                className="block w-full text-left"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => {
                  tenant.selectOrganization(org.id);
                  router.push(routes.portal.root);
                }}
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{org.name}</p>
                      {isCurrent ? <Badge variant="success">Current</Badge> : null}
                    </div>
                    <p className="mt-2">
                      <Badge variant="info">{org.roleLabel}</Badge>
                    </p>
                  </CardBody>
                </Card>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
