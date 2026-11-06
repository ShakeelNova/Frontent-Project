"use client";

import { queryKeys } from "@/api/query-keys";

import {
  listPlanMargins,
  listProviderRates,
  listResourceDefinitions,
  listSupplyPools,
} from "@/api/services/admin-catalog";
import { WarningBadge } from "@/components/admin/badges";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPlainDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";

/**
 * Resource definitions, provider rates, supply pools and margins.
 * EVERYTHING cost-related on this screen is platform-internal: it comes
 * from the admin seam, which 403s tenant sessions, and is rendered only
 * inside the (admin) area.
 */
export function ResourcesRates() {
  const resourcesQuery = useQuery({ queryKey: queryKeys.admin.resources, queryFn: listResourceDefinitions });
  const ratesQuery = useQuery({ queryKey: queryKeys.admin.rates, queryFn: listProviderRates });
  const poolsQuery = useQuery({ queryKey: queryKeys.admin.pools, queryFn: listSupplyPools });
  const marginsQuery = useQuery({ queryKey: queryKeys.admin.margins, queryFn: listPlanMargins });

  const isLoading =
    resourcesQuery.isLoading || ratesQuery.isLoading || poolsQuery.isLoading || marginsQuery.isLoading;
  const firstError = resourcesQuery.error ?? ratesQuery.error ?? poolsQuery.error ?? marginsQuery.error;

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (firstError) {
    return (
      <ErrorState
        error={firstError}
        onRetry={() => {
          void resourcesQuery.refetch();
          void ratesQuery.refetch();
          void poolsQuery.refetch();
          void marginsQuery.refetch();
        }}
      />
    );
  }

  const defByKey = new Map((resourcesQuery.data ?? []).map((r) => [r.key, r]));

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="warning" title="Internal cost data">
        Provider rates, pool allocations and margin estimates below are
        Fluxeaze-internal. They are served only to platform-admin sessions
        and must never appear in tenant-facing screens.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Resource definitions</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>What counts as one unit</TableHead>
                <TableHead>Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resourcesQuery.data ?? []).map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.unitLabel}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>
                    {r.availability === "available" ? (
                      <Badge variant="success">Available</Badge>
                    ) : (
                      <Badge variant="default">Not enabled</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider resource rates</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Unit cost</TableHead>
                <TableHead>Billed</TableHead>
                <TableHead>Effective from</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ratesQuery.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{defByKey.get(r.resourceKey)?.name ?? r.resourceKey}</TableCell>
                  <TableCell>{r.providerLabel}</TableCell>
                  <TableCell>{formatMoney(r.unitCostMinor, r.currency)}</TableCell>
                  <TableCell>{r.billingUnitLabel}</TableCell>
                  <TableCell>{formatPlainDate(r.effectiveFromUtc.slice(0, 10))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supply pools</CardTitle>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pool</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(poolsQuery.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.allocatedUnits.toLocaleString()}</TableCell>
                    <TableCell>{p.availableUnits.toLocaleString()}</TableCell>
                    <TableCell>{p.utilizationPercent}%</TableCell>
                    <TableCell>
                      <WarningBadge level={p.warningLevel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Margin per published version</CardTitle>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Est. cost / mo</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(marginsQuery.data ?? []).map((m) => (
                  <TableRow key={m.versionId}>
                    <TableCell className="font-medium">{m.versionLabel}</TableCell>
                    <TableCell>{m.priceMinor === null ? "Custom" : formatMoney(m.priceMinor, m.currency)}</TableCell>
                    <TableCell>{m.estimatedMonthlyCostMinor === null ? "Not estimated" : formatMoney(m.estimatedMonthlyCostMinor, m.currency)}</TableCell>
                    <TableCell>{m.marginPercent === null ? "—" : `${m.marginPercent}%`}</TableCell>
                    <TableCell>
                      <WarningBadge level={m.warningLevel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-caption text-muted">
              Estimates come from the backend cost model (rates × typical
              utilization). Newly published versions show “Not estimated”
              until the model prices them.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
