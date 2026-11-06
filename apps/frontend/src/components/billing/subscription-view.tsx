"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  SUBSCRIPTION_STATUS_LABELS,
  getOrgSubscription,
  type SubscriptionResourceUsage,
  type SubscriptionStatus,
} from "@/api/services/subscription";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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

const dateOf = (iso: string) => formatPlainDate(iso.slice(0, 10));

const STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  cancelled: "error",
};

const WARNING_VARIANT: Record<SubscriptionResourceUsage["warningLevel"], BadgeVariant> = {
  ok: "success",
  warning: "warning",
  critical: "error",
};

function UsageBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <span
      aria-hidden="true"
      className="block h-2 w-28 overflow-hidden rounded-full bg-surface-raised"
    >
      <span
        className="block h-full rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}

/**
 * Tenant subscription view (Phase 8). READ-ONLY by design: pilot plan
 * changes and add-on activation are performed by Fluxeaze platform
 * admins — there is no checkout and no pay button anywhere on this page.
 * Everything renders API values: USD minor units via formatMoney,
 * backend-computed usage percentages, and the immutable plan-version
 * snapshot this subscription runs on.
 */
export function SubscriptionView() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";

  const query = useQuery({
    queryKey: queryKeys.billing.subscription(orgId),
    queryFn: () => getOrgSubscription(orgId),
    enabled: Boolean(orgId),
  });

  if (!orgId || query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading subscription">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const sub = query.data;
  if (!sub) {
    return (
      <EmptyState
        title="No subscription yet"
        description="This organization doesn't have an active Fluxeaze subscription. Pilot subscriptions are activated by the Fluxeaze platform team — once yours is active, its plan, allowances and history will appear here."
        action={
          <Link
            href={routes.requestPilot}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Request a pilot
          </Link>
        }
      />
    );
  }

  const newerVersion =
    sub.latestPublishedVersionLabel &&
    sub.latestPublishedVersionLabel !== sub.planVersionLabel
      ? sub.latestPublishedVersionLabel
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="info" title="Managed by the Fluxeaze team">
        Pilot subscription and add-on activation are currently managed by
        Fluxeaze platform admins. Please contact support or your account
        manager —{" "}
        <a className="font-medium underline" href={`mailto:${sub.billingContactEmail}`}>
          {sub.billingContactEmail}
        </a>
        . There is no online checkout for subscriptions.
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Current plan"
          value={sub.planName}
          hint={`Running on snapshot ${sub.planVersionLabel}`}
        />
        <MetricCard
          label="Plan price"
          value={
            sub.priceMinor === null
              ? "Custom pricing"
              : `${formatMoney(sub.priceMinor, sub.currency)} / ${sub.billingPeriod}`
          }
          hint="As sold on this snapshot — from the API"
        />
        <MetricCard
          label="Current period"
          value={`${dateOf(sub.currentPeriodStartUtc)} – ${dateOf(sub.currentPeriodEndUtc)}`}
          hint={`Active since ${dateOf(sub.effectiveFromUtc)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Subscription snapshot</CardTitle>
            <Badge variant={STATUS_VARIANT[sub.status]}>
              {SUBSCRIPTION_STATUS_LABELS[sub.status]}
            </Badge>
            <Badge variant="info">{sub.planVersionLabel}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted">
            Your subscription runs on the <strong>{sub.planVersionLabel}</strong>{" "}
            version snapshot. When Fluxeaze publishes a new plan version, your
            price and allowances here do not change silently — any move to a
            newer version is arranged with you by the platform team.
          </p>
          {newerVersion ? (
            <p className="mt-2 text-sm">
              A newer version (<strong>{newerVersion}</strong>) is published in
              the catalogue. You remain on {sub.planVersionLabel} until a plan
              change is agreed.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowances & usage</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Included</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sub.resources.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <span className="font-medium">{r.label}</span>
                    {r.isCredits ? (
                      <span className="block text-caption text-muted">
                        Internal credits — not money
                      </span>
                    ) : null}
                  </TableCell>
                  {r.availability === "not_enabled" ? (
                    <>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Badge variant="default">Not enabled</Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        {r.used.toLocaleString()} {r.unit}
                      </TableCell>
                      <TableCell>
                        {r.included === null
                          ? "Custom"
                          : `${r.included.toLocaleString()} ${r.unit}`}
                      </TableCell>
                      <TableCell>
                        {r.usagePercent === null ? (
                          "—"
                        ) : (
                          <span className="flex items-center gap-2">
                            <UsageBar percent={r.usagePercent} />
                            {r.usagePercent}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={WARNING_VARIANT[r.warningLevel]}>
                          {r.warningLevel === "ok"
                            ? "Within limit"
                            : r.warningLevel === "warning"
                              ? "Approaching limit"
                              : "Nearly full"}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-caption text-muted">
            Usage is computed by the backend. At 100% student capacity, new
            enrollments are paused — existing students and records are never
            affected.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Renewals & changes</CardTitle>
          </CardHeader>
          <CardBody>
            {sub.events.length === 0 ? (
              <p className="text-sm text-muted">No subscription events yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sub.events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{dateOf(e.occurredAtUtc)}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{e.planVersionLabel}</TableCell>
                      <TableCell>
                        {e.amountMinor === null
                          ? "—"
                          : formatMoney(e.amountMinor, e.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
          </CardHeader>
          <CardBody>
            {sub.addons.length === 0 ? (
              <p className="text-sm text-muted">No add-ons are published for this plan yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {sub.addons.map((addon) => (
                  <li
                    key={addon.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{addon.name}</p>
                      <p className="text-sm text-muted">
                        {addon.allowanceLabel}
                        {addon.priceMinor !== null
                          ? ` · ${formatMoney(addon.priceMinor, addon.currency)} / ${addon.billingPeriod}`
                          : ""}
                      </p>
                      <p className="text-sm text-muted">{addon.description}</p>
                    </div>
                    <Badge variant={addon.status === "enabled" ? "success" : "info"}>
                      {addon.status === "enabled" ? "Enabled" : "Available"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-caption text-muted">
              To enable an available add-on, contact{" "}
              <a className="underline" href={`mailto:${sub.billingContactEmail}`}>
                {sub.billingContactEmail}
              </a>{" "}
              — activation is handled by Fluxeaze platform admins during the
              pilot.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
