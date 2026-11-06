"use client";

import { queryKeys } from "@/api/query-keys";

import {
  getIntegrationFlags,
  type IntegrationStatus,
} from "@/api/services/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

const STATUS_BADGE: Record<IntegrationStatus, { variant: BadgeVariant; label: string }> = {
  enabled: { variant: "success", label: "Enabled" },
  not_enabled: { variant: "default", label: "Not enabled" },
  coming_soon: { variant: "info", label: "Coming soon" },
};

/**
 * Integrations (Phase 8) — truthful representation only. Every status
 * comes from the backend; deferred integrations render as not-enabled
 * explanations. There are deliberately NO connect/configure controls:
 * nothing here can pretend an integration works when it doesn't.
 */
export default function IntegrationsPage() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";

  const query = useQuery({
    queryKey: queryKeys.settings.integrations(orgId),
    queryFn: () => getIntegrationFlags(orgId),
    enabled: Boolean(orgId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-h5">Integrations</h2>
        <p className="mt-1 text-sm text-muted">
          External services connected to {currentOrganization?.name ?? "your organization"}.
          Statuses come from the backend — integrations that aren&apos;t enabled
          say so plainly instead of offering controls that wouldn&apos;t do anything.
        </p>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          title="No integrations defined"
          description="The backend hasn't published any integration flags for this organization yet."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {query.data.map((flag) => {
            const badge = STATUS_BADGE[flag.status];
            return (
              <li key={flag.key}>
                <Card>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{flag.name}</p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{flag.description}</p>
                    <p className="mt-2 text-sm">{flag.noteLabel}</p>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
