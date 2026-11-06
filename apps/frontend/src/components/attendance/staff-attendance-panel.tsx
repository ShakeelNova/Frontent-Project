"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  getStaffAttendance,
  STAFF_DAY_STATUS_LABELS,
  type StaffDayStatus,
} from "@/api/services/attendance";
import { getOrgPreferences } from "@/api/services/setup";
import { listDepartments } from "@/api/services/staff";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUtcTimeInZone } from "@/lib/datetime";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_VARIANT: Record<StaffDayStatus, "success" | "warning" | "error" | "info" | "default"> = {
  present: "success",
  late: "warning",
  absent: "error",
  on_leave: "info",
  missing_punch: "warning",
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function punchTime(isoUtc: string | null, timezone: string): string {
  if (!isoUtc) return "—";
  return formatUtcTimeInZone(isoUtc.slice(11, 16), timezone);
}

export function StaffAttendancePanel() {
  const { currentOrganization, branches, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const date = searchParams.get("date") ?? todayLocal();
  const branchParam = searchParams.get("branch") ?? undefined;
  const branchId =
    branchParam === "all" ? undefined : (branchParam ?? currentBranch?.id ?? undefined);
  const deptParam = searchParams.get("dept") ?? undefined;
  const departmentId = !deptParam || deptParam === "all" ? undefined : deptParam;
  const isBranchManager = currentOrganization?.role === "branch_manager";

  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  const departmentsQuery = useQuery({
    queryKey: queryKeys.staff.departments(orgId),
    queryFn: () => listDepartments(orgId),
    enabled: Boolean(orgId),
  });

  const query = useQuery({
    queryKey: queryKeys.attendance.staff(orgId, date, branchId ?? "all", departmentId ?? "all"),
    queryFn: () => getStaffAttendance(orgId, date, branchId, departmentId),
    enabled: Boolean(orgId),
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <section aria-labelledby="staff-att-heading">
      <h2 id="staff-att-heading" className="text-h4">
        Staff attendance
      </h2>
      <p className="mt-1 text-sm text-muted">
        First-in / last-out punches per day. Late and missing-punch flags are
        computed by the backend; times display in {timezone} (stored as UTC).
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="staff-att-date" className="mb-1.5 block text-sm font-medium">
            Date
          </label>
          <Input
            id="staff-att-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setParam("date", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="staff-att-branch" className="mb-1.5 block text-sm font-medium">
            Branch
          </label>
          <Select
            id="staff-att-branch"
            value={branchId ?? "all"}
            onChange={(e) => setParam("branch", e.target.value)}
          >
            {!isBranchManager ? <option value="all">All branches</option> : null}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="staff-att-dept" className="mb-1.5 block text-sm font-medium">
            Department
          </label>
          <Select
            id="staff-att-dept"
            value={departmentId ?? "all"}
            onChange={(e) => setParam("dept", e.target.value)}
          >
            <option value="all">All departments</option>
            {(departmentsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <div role="status" aria-label="Loading staff attendance" className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.rows.length === 0 ? (
          <EmptyState
            title="No active staff for this selection"
            description="Staff attendance appears once team members are active in this branch."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Present" value={String(query.data.summary.present)} />
              <MetricCard label="Late" value={String(query.data.summary.late)} />
              <MetricCard label="Absent" value={String(query.data.summary.absent)} />
              <MetricCard label="On leave" value={String(query.data.summary.on_leave)} />
              <MetricCard label="Missing punch" value={String(query.data.summary.missing_punch)} />
            </div>
            <div className="overflow-x-auto">
              <Table aria-label="Staff attendance">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>First in</TableHead>
                    <TableHead>Last out</TableHead>
                    <TableHead>Day status (backend)</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.rows.map((row) => (
                    <TableRow key={row.staffId}>
                      <TableCell>
                        <Link
                          href={routes.portal.staffMember(row.staffId)}
                          className="font-medium text-primary underline"
                        >
                          {row.fullName}
                        </Link>
                        <span className="block font-mono text-xs text-muted">{row.staffCode}</span>
                      </TableCell>
                      <TableCell>{row.branchName}</TableCell>
                      <TableCell>{row.departmentName ?? "—"}</TableCell>
                      <TableCell>{punchTime(row.firstInUtc, timezone)}</TableCell>
                      <TableCell>{punchTime(row.lastOutUtc, timezone)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[row.dayStatus]}>
                          {STAFF_DAY_STATUS_LABELS[row.dayStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {row.flags.join("; ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
