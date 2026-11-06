"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getBranchDashboard, type DateRange } from "@/api/services/dashboards";
import { normalizeApiError } from "@/api/errors";
import { CapacityBanner } from "@/components/dashboard/capacity-banner";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { rangeKey } from "@/lib/dates";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function BranchDashboardView({
  organizationId,
  branchId,
  range,
}: {
  organizationId: string;
  branchId: string;
  range: DateRange;
}) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.branch(organizationId, branchId, rangeKey(range)),
    queryFn: () => getBranchDashboard(organizationId, branchId, range),
  });

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading branch dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

  if (query.isError) {
    const info = normalizeApiError(query.error);
    return (
      <ErrorState
        error={query.error}
        title={info.isForbidden ? "You're not authorized for this branch" : undefined}
        description={
          info.isForbidden
            ? "Branch dashboards only show branches the backend has authorized for your account. Pick another branch above, or ask an owner to grant access."
            : undefined
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const drill = (path: string) =>
    `${path}?branch=${encodeURIComponent(branchId)}&from=${range.from}&to=${range.to}`;

  if (data.activeStudents === 0 && data.totalStaff === 0) {
    return (
      <EmptyState
        title={`No activity yet at ${data.branchName}`}
        description="Once students and staff are onboarded for this branch, its attendance and fee summary will appear here."
        action={
          <Link
            href={routes.portal.settingsOnboarding}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            See onboarding options
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CapacityBanner capacity={data.capacity} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`Active students · ${data.branchName}`}
          value={data.activeStudents.toLocaleString()}
          href={drill("/portal/students")}
        />
        <MetricCard label="Staff" value={data.totalStaff.toLocaleString()} href={drill("/portal/staff")} />
        <MetricCard
          label="Attendance (selected period)"
          value={data.attendancePercent !== null ? `${data.attendancePercent}%` : "—"}
          hint={data.attendancePercent === null ? "No sessions recorded yet" : undefined}
          href={drill("/portal/attendance")}
        />
        <MetricCard
          label="Outstanding fees"
          value={formatMoney(data.outstandingFeesMinor, data.currency)}
          hint={`${data.overdueVouchers} overdue voucher(s)`}
          href={drill("/portal/fees")}
        />
      </div>
    </div>
  );
}
