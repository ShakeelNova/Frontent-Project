"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getOrgDashboard } from "@/api/services/dashboards";
import { normalizeApiError } from "@/api/errors";
import { BranchDashboardView } from "@/components/dashboard/branch-dashboard-view";
import { CapacityBanner, CapacityMeter } from "@/components/dashboard/capacity-banner";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { EmptyState } from "@/components/feedback/empty-state";
import { HelpButton } from "@/components/help/help-button";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
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
import { rangeKey, resolveDateRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function OrgDashboard() {
  const tenant = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = resolveDateRange({
    preset: searchParams.get("preset"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  const org = tenant.currentOrganization;
  const orgId = org?.id ?? "";

  const query = useQuery({
    queryKey: queryKeys.dashboard.org(orgId, rangeKey(range)),
    queryFn: () => getOrgDashboard(orgId, range),
    enabled: Boolean(orgId),
  });

  if (!org) return null;

  const drill = (path: string, branchId?: string) =>
    `${path}?from=${range.from}&to=${range.to}${branchId ? `&branch=${encodeURIComponent(branchId)}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1>{org.name} dashboard</h1>
          <HelpButton featureId="dashboard" featureLabel="Dashboard" />
        </div>
        <div>
          <p className="mt-1 text-muted">
            {range.from} → {range.to} · {org.roleLabel} view
            {tenant.currentBranch ? ` · focus: ${tenant.currentBranch.name}` : " · all branches"}
          </p>
        </div>
        <DateRangeFilter />
      </header>

      <SetupChecklist />

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        normalizeApiError(query.error).isForbidden ? (
          <div className="flex flex-col gap-4">
            <Alert variant="info" title="Org-wide metrics are restricted to Owners and General Managers">
              Showing your authorized branch dashboard instead. The backend
              enforces this scope on every request.
            </Alert>
            {tenant.currentBranch ? (
              <BranchDashboardView
                organizationId={orgId}
                branchId={tenant.currentBranch.id}
                range={range}
              />
            ) : (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            )}
          </div>
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : query.data.activeStudents === 0 && query.data.totalStaff === 0 ? (
        <EmptyState
          title="Nothing to report yet"
          description="This organization has no students or staff yet. Complete the setup checklist above — dashboards fill in as your branches come alive."
          action={
            <Link
              href={routes.portal.settingsOnboarding}
              className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Start onboarding
            </Link>
          }
        />
      ) : (
        <>
          {query.data.alerts.map((alert) => (
            <Alert key={alert} variant="warning" title="Heads up">
              {alert}
            </Alert>
          ))}
          <CapacityBanner capacity={query.data.capacity} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active students"
              value={query.data.activeStudents.toLocaleString()}
              href={drill("/portal/students")}
            />
            <MetricCard
              label="Staff"
              value={query.data.totalStaff.toLocaleString()}
              href={drill("/portal/staff")}
            />
            <MetricCard
              label="Attendance (selected period)"
              value={query.data.attendancePercent !== null ? `${query.data.attendancePercent}%` : "—"}
              hint={query.data.attendancePercent === null ? "No sessions recorded yet" : undefined}
              href={drill("/portal/attendance")}
            />
            <MetricCard
              label="Outstanding fees"
              value={formatMoney(query.data.outstandingFeesMinor, query.data.currency)}
              href={drill("/portal/fees")}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student capacity</CardTitle>
            </CardHeader>
            <CardBody>
              <CapacityMeter capacity={query.data.capacity} />
            </CardBody>
          </Card>

          <section aria-labelledby="branch-comparison-heading">
            <h2 id="branch-comparison-heading" className="text-h4">
              Branch comparison
            </h2>
            <div className="mt-3">
              <Table aria-label="Branch comparison">
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Active students</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Outstanding fees</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.branches.map((row) => (
                    <TableRow key={row.branchId}>
                      <TableCell className="font-medium">{row.branchName}</TableCell>
                      <TableCell>{row.activeStudents.toLocaleString()}</TableCell>
                      <TableCell>
                        {row.attendancePercent !== null ? `${row.attendancePercent}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {formatMoney(row.outstandingFeesMinor, query.data.currency)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium text-primary underline"
                          onClick={() => {
                            tenant.selectBranch(row.branchId);
                            router.push(routes.portal.branch);
                          }}
                        >
                          Open branch →
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
