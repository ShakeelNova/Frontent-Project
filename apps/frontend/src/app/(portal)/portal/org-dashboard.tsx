"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getOrgDashboard } from "@/api/services/dashboards";
import { getAcademicYearBasics } from "@/api/services/setup";
import { getOrgSubscription } from "@/api/services/subscription";
import { normalizeApiError } from "@/api/errors";
import { BranchDashboardView } from "@/components/dashboard/branch-dashboard-view";
import { CapacityMeter } from "@/components/dashboard/capacity-banner";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { EmptyState } from "@/components/feedback/empty-state";
import { HelpButton } from "@/components/help/help-button";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Donut } from "@/components/ui/charts";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { rangeKey, resolveDateRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function series(values: number[]): number[] {
  return values.length > 1 ? values : [];
}

export function OrgDashboard() {
  const tenant = useTenant();
  const { user } = useAuth();
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

  const academicYear = useQuery({
    queryKey: queryKeys.organization.academicYear(orgId),
    queryFn: () => getAcademicYearBasics(orgId),
    enabled: Boolean(orgId),
  });

  const subscription = useQuery({
    queryKey: queryKeys.billing.subscription(orgId),
    queryFn: () => getOrgSubscription(orgId),
    enabled: Boolean(orgId),
  });

  if (!org) return null;

  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";
  const drill = (path: string, branchId?: string) =>
    `${path}?from=${range.from}&to=${range.to}${branchId ? `&branch=${encodeURIComponent(branchId)}` : ""}`;

  const quickActions: Array<{ label: string; description: string; href: string; icon: IconName }> = [
    { label: "Add a student", description: "Admission & enrollment", href: routes.portal.students, icon: "students" },
    { label: "Take attendance", description: "Class roster & marking", href: routes.portal.attendance, icon: "attendance" },
    { label: "Generate vouchers", description: "Fee structures & billing", href: routes.portal.fees, icon: "wallet" },
    { label: "Invite a staff member", description: "Roles & branch access", href: routes.portal.staff, icon: "staff" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={org.name}
        title={`Welcome back, ${firstName}!`}
        description={`Here's what's happening across ${org.name}${tenant.currentBranch ? ` · ${tenant.currentBranch.name}` : " · all branches"}.`}
        actions={
          <>
            <HelpButton featureId="dashboard" featureLabel="Dashboard" />
            <Link
              href={routes.portal.students}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add student
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="purple" dot>
            {range.from} → {range.to}
          </Badge>
          <Badge variant="neutral">{org.roleLabel} view</Badge>
          {tenant.currentBranch ? <Badge variant="neutral">{tenant.currentBranch.name}</Badge> : null}
        </div>
        <DateRangeFilter />
      </div>

      <SetupChecklist />

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        normalizeApiError(query.error).isForbidden ? (
          <div className="flex flex-col gap-4">
            <Alert variant="info" title="Org-wide metrics are restricted to Owners and General Managers">
              Showing your authorized branch dashboard instead. The backend enforces this scope on every request.
            </Alert>
            {tenant.currentBranch ? (
              <BranchDashboardView organizationId={orgId} branchId={tenant.currentBranch.id} range={range} />
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
              className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total students"
              value={query.data.activeStudents.toLocaleString()}
              icon={<Icon name="students" className="h-5 w-5" />}
              hint={`${query.data.branches.length} branch(es)`}
              spark={series(query.data.branches.map((branch) => branch.activeStudents))}
              href={drill("/portal/students")}
            />
            <StatCard
              label="Total staff"
              value={query.data.totalStaff.toLocaleString()}
              icon={<Icon name="staff" className="h-5 w-5" />}
              tone="cyan"
              hint="Across all branches"
              href={drill("/portal/staff")}
            />
            <StatCard
              label="Attendance"
              value={query.data.attendancePercent !== null ? `${query.data.attendancePercent}%` : "—"}
              icon={<Icon name="attendance" className="h-5 w-5" />}
              tone="green"
              hint="Selected period"
              spark={series(query.data.branches.map((branch) => branch.attendancePercent ?? 0))}
              href={drill("/portal/attendance")}
            />
            <StatCard
              label="Outstanding fees"
              value={formatMoney(query.data.outstandingFeesMinor, query.data.currency)}
              icon={<Icon name="wallet" className="h-5 w-5" />}
              tone="pink"
              hint={`${query.data.branches.length} branch(es)`}
              href={drill("/portal/fees")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Students by branch</CardTitle>
                  <p className="mt-1 text-sm text-muted">Active enrollment across your authorized branches.</p>
                </div>
                <Badge variant="purple">{query.data.branches.length} branches</Badge>
              </CardHeader>
              <CardBody>
                {query.data.branches.length > 0 ? (
                  <BarChart
                    data={query.data.branches.map((branch) => ({ label: branch.branchName, value: branch.activeStudents }))}
                    height={190}
                  />
                ) : (
                  <p className="py-10 text-center text-sm text-faint">No branches yet.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance overview</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col items-center gap-4">
                <Donut
                  value={query.data.attendancePercent ?? 0}
                  label={query.data.attendancePercent !== null ? `${query.data.attendancePercent}%` : "—"}
                  caption="selected period"
                  tone="green"
                />
                <div className="w-full">
                  <div className="flex items-center justify-between text-caption text-faint">
                    <span>Student capacity</span>
                    <span>{Math.round(query.data.capacity.usagePercent)}%</span>
                  </div>
                  <Progress
                    className="mt-2"
                    value={query.data.capacity.usagePercent}
                    tone={query.data.capacity.usagePercent >= 90 ? "error" : query.data.capacity.usagePercent >= 80 ? "amber" : "purple"}
                    label="Student capacity used"
                  />
                  <p className="mt-2 text-caption text-faint">
                    {query.data.capacity.activeStudents.toLocaleString()} active
                    {query.data.capacity.capacityLimit ? ` of ${query.data.capacity.capacityLimit.toLocaleString()}` : ""} students
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Branch comparison</CardTitle>
                  <p className="mt-1 text-sm text-muted">A side-by-side view of every branch you can access.</p>
                </div>
                <Link href={routes.portal.branch} className="text-sm font-medium text-primary hover:underline">
                  Open branch dashboard
                </Link>
              </CardHeader>
              <CardBody className="pt-0">
                <Table aria-label="Branch comparison">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.branches.map((row) => (
                      <TableRow key={row.branchId}>
                        <TableCell className="font-medium text-text">{row.branchName}</TableCell>
                        <TableCell>{row.activeStudents.toLocaleString()}</TableCell>
                        <TableCell>{row.attendancePercent !== null ? `${row.attendancePercent}%` : "—"}</TableCell>
                        <TableCell>{formatMoney(row.outstandingFeesMinor, query.data.currency)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-sm font-medium text-primary hover:underline"
                            onClick={() => {
                              tenant.selectBranch(row.branchId);
                              router.push(routes.portal.branch);
                            }}
                          >
                            Open →
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-input-border hover:bg-surface-raised"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon name={action.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text">{action.label}</span>
                      <span className="block text-caption text-faint">{action.description}</span>
                    </span>
                    <Icon name="chevronRight" className="ml-auto h-4 w-4 shrink-0 text-faint" />
                  </Link>
                ))}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Academic year</CardTitle>
              </CardHeader>
              <CardBody>
                {academicYear.data ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-text">
                      {academicYear.data.label}
                    </p>
                    <p className="text-sm text-muted">
                      {academicYear.data.startsOn} → {academicYear.data.endsOn}
                    </p>
                    <Link href={routes.portal.settingsAcademicYear} className="mt-1 text-sm font-medium text-primary hover:underline">
                      Manage academic year
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-faint">No academic year configured yet.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan &amp; usage</CardTitle>
              </CardHeader>
              <CardBody>
                {subscription.data ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text">{subscription.data.planName}</p>
                      <Badge variant="purple">{subscription.data.planVersionLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted">
                      {subscription.data.resources.length} resources tracked · renews{" "}
                      {subscription.data.currentPeriodEndUtc}
                    </p>
                    <Link href={routes.portal.billing} className="mt-1 text-sm font-medium text-primary hover:underline">
                      View subscription
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted">No subscription on this organization yet.</p>
                    <Link href={routes.portal.billing} className="text-sm font-medium text-primary hover:underline">
                      View billing options
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capacity</CardTitle>
              </CardHeader>
              <CardBody>
                <CapacityMeter capacity={query.data.capacity} />
                <Link href={routes.portal.settings} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Review plan &amp; settings
                </Link>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
