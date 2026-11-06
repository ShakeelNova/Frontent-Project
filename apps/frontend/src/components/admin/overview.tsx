"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getAdminOverview } from "@/api/services/admin-catalog";
import { WarningBadge } from "@/components/admin/badges";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ErrorState } from "@/components/feedback/error-state";
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
import Link from "next/link";

/** Platform-admin overview: catalogue health, supply/margin risk, audit. */
export function AdminOverview() {
  const query = useQuery({ queryKey: queryKeys.admin.overview, queryFn: getAdminOverview });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading platform overview">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  const data = query.data;
  const marginsAtRisk = data.margins.filter((m) => m.warningLevel !== "ok");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Plans" value={String(data.planCount)} hint={`${data.publishedVersionCount} published version(s) live`} href={routes.admin.plans} />
        <MetricCard label="Draft versions" value={String(data.draftVersionCount)} hint={`${data.versionsAwaitingApproval} in preview awaiting approval`} href={routes.admin.plans} />
        <MetricCard label="Open quotes" value={String(data.openQuoteCount)} hint="Draft, sent or accepted" href={routes.admin.quotes} />
        <MetricCard label="Supply pools at risk" value={String(data.poolsAtRisk)} hint="Utilization ≥ 80% (backend-flagged)" href={routes.admin.resources} />
        <MetricCard label="Margins at risk" value={String(marginsAtRisk.length)} hint="Published versions below the margin threshold" href={routes.admin.resources} />
        <MetricCard label="Audit events" value={String(data.recentAudit.length)} hint="Most recent shown below" href={routes.admin.audit} />
      </div>

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
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pools.map((pool) => (
                  <TableRow key={pool.id}>
                    <TableCell className="font-medium">{pool.name}</TableCell>
                    <TableCell>
                      {pool.allocatedUnits.toLocaleString()} / {pool.totalUnits.toLocaleString()}
                    </TableCell>
                    <TableCell>{pool.utilizationPercent}%</TableCell>
                    <TableCell>
                      <WarningBadge level={pool.warningLevel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Margins (published versions)</CardTitle>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Est. cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.margins.map((m) => (
                  <TableRow key={m.versionId}>
                    <TableCell className="font-medium">{m.versionLabel}</TableCell>
                    <TableCell>{m.priceMinor === null ? "Custom" : formatMoney(m.priceMinor, m.currency)}</TableCell>
                    <TableCell>{m.estimatedMonthlyCostMinor === null ? "—" : formatMoney(m.estimatedMonthlyCostMinor, m.currency)}</TableCell>
                    <TableCell>{m.marginPercent === null ? "—" : `${m.marginPercent}%`}</TableCell>
                    <TableCell>
                      <WarningBadge level={m.warningLevel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-caption text-muted">
              Internal estimates from the provider-cost model — never exposed to tenants.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Recent audit activity</CardTitle>
            <Link href={routes.admin.audit} className="text-sm font-medium text-primary underline">
              Full audit history →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col gap-2">
            {data.recentAudit.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="text-muted">{formatPlainDate(e.occurredAtUtc.slice(0, 10))}</span>{" "}
                · <span className="font-medium">{e.actorLabel}</span> · {e.summary}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
