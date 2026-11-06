"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  listDepartments,
  listDesignations,
  listStaff,
  STAFF_STATUS_LABELS,
  type StaffStatus,
} from "@/api/services/staff";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InviteStaffDialog } from "@/components/staff/staff-forms";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STATUS_VARIANT: Record<StaffStatus, "success" | "warning" | "default" | "info"> = {
  invited: "info",
  active: "success",
  inactive: "default",
};
const PAGE_SIZES = [10, 25, 50];

export function StaffDirectory() {
  const { currentOrganization, branches, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [inviteOpen, setInviteOpen] = useState(false);

  const qParam = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(qParam);
  const status = (searchParams.get("status") as StaffStatus | null) ?? undefined;
  const departmentId = searchParams.get("department") ?? undefined;
  const designationId = searchParams.get("designation") ?? undefined;
  const branchParam = searchParams.get("branch") ?? undefined;
  const branchId =
    branchParam === "all" ? undefined : (branchParam ?? currentBranch?.id ?? undefined);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "10");
  const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : 10;

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    });
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (searchInput === qParam) return;
    const t = setTimeout(() => setParams({ q: searchInput || null, page: null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const departmentsQuery = useQuery({
    queryKey: queryKeys.staff.departments(orgId),
    queryFn: () => listDepartments(orgId),
    enabled: Boolean(orgId),
  });
  const designationsQuery = useQuery({
    queryKey: queryKeys.staff.designations(orgId),
    queryFn: () => listDesignations(orgId),
    enabled: Boolean(orgId),
  });

  const paramsKey = useMemo(
    () =>
      JSON.stringify({
        page,
        pageSize,
        q: qParam,
        branchId: branchId ?? "",
        status: status ?? "",
        departmentId: departmentId ?? "",
        designationId: designationId ?? "",
      }),
    [page, pageSize, qParam, branchId, status, departmentId, designationId],
  );

  const query = useQuery({
    queryKey: queryKeys.staff.list(orgId, paramsKey),
    queryFn: () =>
      listStaff(orgId, {
        page,
        pageSize,
        search: qParam || undefined,
        branchId,
        status,
        departmentId,
        designationId,
      }),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(qParam || status || departmentId || designationId || branchParam);
  const isBranchManager = currentOrganization?.role === "branch_manager";
  const pendingCount = (query.data?.items ?? []).filter(
    (s) => s.approvalState === "pending",
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Staff</h1>
          <p className="mt-1 text-muted">
            {currentOrganization?.name}
            {branchId
              ? ` · ${branches.find((b) => b.id === branchId)?.name ?? "branch"}`
              : " · all branches"}
            {query.data ? ` · ${total.toLocaleString()} staff` : ""}
            {pendingCount > 0 ? ` · ${pendingCount} awaiting approval` : ""}
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Invite staff</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="staff-search" className="mb-1.5 block text-sm font-medium">
            Search by name, email or staff ID
          </label>
          <Input
            id="staff-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Sana or SUN-STF-002"
          />
        </div>
        <div>
          <label htmlFor="staff-branch" className="mb-1.5 block text-sm font-medium">
            Branch
          </label>
          <Select
            id="staff-branch"
            value={branchId ?? "all"}
            onChange={(e) =>
              setParams({ branch: e.target.value === "all" ? "all" : e.target.value, page: null })
            }
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
          <label htmlFor="staff-department" className="mb-1.5 block text-sm font-medium">
            Department
          </label>
          <Select
            id="staff-department"
            value={departmentId ?? ""}
            onChange={(e) => setParams({ department: e.target.value || null, page: null })}
          >
            <option value="">All departments</option>
            {(departmentsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="staff-designation" className="mb-1.5 block text-sm font-medium">
            Designation
          </label>
          <Select
            id="staff-designation"
            value={designationId ?? ""}
            onChange={(e) => setParams({ designation: e.target.value || null, page: null })}
          >
            <option value="">All designations</option>
            {(designationsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="staff-status" className="mb-1.5 block text-sm font-medium">
            Status
          </label>
          <Select
            id="staff-status"
            value={status ?? ""}
            onChange={(e) => setParams({ status: e.target.value || null, page: null })}
          >
            <option value="">All statuses</option>
            {(Object.keys(STAFF_STATUS_LABELS) as StaffStatus[]).map((s) => (
              <option key={s} value={s}>
                {STAFF_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters ? (
          <Button
            variant="subtle"
            onClick={() => {
              setSearchInput("");
              setParams({ q: null, status: null, department: null, designation: null, branch: null, page: null });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {query.isPending ? (
        <div aria-label="Loading staff" role="status" className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          title="No staff yet"
          description="Invite your first team member — they'll get an email to set up their account."
          action={<Button onClick={() => setInviteOpen(true)}>Invite staff</Button>}
        />
      ) : total === 0 ? (
        <EmptyState
          title="No staff match these filters."
          description="Try a different search or clear the filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table aria-label="Staff">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role(s)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={routes.portal.staffMember(s.id)}
                        className="font-medium text-primary underline"
                      >
                        {s.fullName}
                      </Link>
                      <span className="block text-xs text-muted">{s.email}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.staffCode}</TableCell>
                    <TableCell>{s.primaryBranchName}</TableCell>
                    <TableCell>
                      {s.departmentName ?? "—"}
                      {s.designationName ? (
                        <span className="block text-xs text-muted">{s.designationName}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {s.roles.map((r) => (
                          <Badge key={r.key} variant="info">
                            {r.label}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status]}>
                        {STAFF_STATUS_LABELS[s.status]}
                      </Badge>
                      {s.approvalState === "pending" ? (
                        <Badge variant="warning" className="ml-1">
                          Pending approval
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={routes.portal.staffMember(s.id)}
                        className="text-sm font-medium text-primary underline"
                        aria-label={`View ${s.fullName}`}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav aria-label="Staff pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted" aria-live="polite">
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Rows per page
                <Select
                  aria-label="Rows per page"
                  value={String(pageSize)}
                  onChange={(e) => setParams({ pageSize: e.target.value, page: null })}
                  className="w-auto"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
              <Button variant="subtle" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
                Previous
              </Button>
              <Button
                variant="subtle"
                disabled={page >= totalPages}
                onClick={() => setParams({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}

      <InviteStaffDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
