"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { listPrograms } from "@/api/services/academics";
import {
  listStudents,
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from "@/api/services/students";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { HelpButton } from "@/components/help/help-button";
import { AddStudentDialog } from "@/components/students/student-forms";
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

const STATUS_VARIANT: Record<StudentStatus, "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  alumni: "default",
};

const PAGE_SIZES = [10, 25, 50];

export function StudentsDirectory() {
  const { currentOrganization, branches, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  const qParam = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(qParam);
  const status = (searchParams.get("status") as StudentStatus | null) ?? undefined;
  const programId = searchParams.get("program") ?? undefined;
  const branchParam = searchParams.get("branch") ?? undefined;
  // Default scope: explicit param → tenant's active branch → all branches.
  const branchId = branchParam === "all" ? undefined : (branchParam ?? currentBranch?.id ?? undefined);
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

  // Debounced search → URL (server-side search param), resetting to page 1.
  useEffect(() => {
    if (searchInput === qParam) return;
    const t = setTimeout(
      () => setParams({ q: searchInput || null, page: null }),
      400,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const programsQuery = useQuery({
    queryKey: queryKeys.academics.programs(orgId),
    queryFn: () => listPrograms(orgId),
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
        programId: programId ?? "",
      }),
    [page, pageSize, qParam, branchId, status, programId],
  );

  const query = useQuery({
    queryKey: queryKeys.students.list(orgId, paramsKey),
    queryFn: () =>
      listStudents(orgId, {
        page,
        pageSize,
        search: qParam || undefined,
        branchId,
        status,
        programId,
      }),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(qParam || status || programId || branchParam);
  const isBranchManager = currentOrganization?.role === "branch_manager";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Students</h1>
          <p className="mt-1 text-muted">
            {currentOrganization?.name}
            {branchId
              ? ` · ${branches.find((b) => b.id === branchId)?.name ?? "branch"}`
              : " · all branches"}
            {query.data ? ` · ${total.toLocaleString()} student(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HelpButton featureId="students" featureLabel="Students" />
          <Link
            href={routes.portal.imports}
            className="inline-flex min-h-9 items-center rounded-md border border-border px-3.5 text-sm font-medium hover:bg-surface-raised"
          >
            Import students
          </Link>
          <Button onClick={() => setAddOpen(true)}>Add student</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-56 flex-1">
          <label htmlFor="student-search" className="mb-1.5 block text-sm font-medium">
            Search by name or student ID
          </label>
          <Input
            id="student-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Ayesha or SUN-1001"
          />
        </div>
        <div>
          <label htmlFor="filter-branch" className="mb-1.5 block text-sm font-medium">
            Branch
          </label>
          <Select
            id="filter-branch"
            value={branchId ?? "all"}
            onChange={(e) =>
              setParams({
                branch: e.target.value === "all" ? "all" : e.target.value,
                page: null,
              })
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
          <label htmlFor="filter-status" className="mb-1.5 block text-sm font-medium">
            Status
          </label>
          <Select
            id="filter-status"
            value={status ?? ""}
            onChange={(e) => setParams({ status: e.target.value || null, page: null })}
          >
            <option value="">All statuses</option>
            {(Object.keys(STUDENT_STATUS_LABELS) as StudentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STUDENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="filter-program" className="mb-1.5 block text-sm font-medium">
            Program
          </label>
          <Select
            id="filter-program"
            value={programId ?? ""}
            disabled={programsQuery.isPending}
            onChange={(e) => setParams({ program: e.target.value || null, page: null })}
          >
            <option value="">All programs</option>
            {(programsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters ? (
          <Button
            variant="subtle"
            onClick={() => {
              setSearchInput("");
              setParams({ q: null, status: null, program: null, branch: null, page: null });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {query.isPending ? (
        <div aria-label="Loading students" role="status" className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          title="No students yet."
          description="Add your first student manually, or import a validated file (imports arrive in Phase 7)."
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAddOpen(true)}>Add student</Button>
              <Link
                href={routes.portal.imports}
                className="inline-flex min-h-9 items-center rounded-md border border-border px-3.5 text-sm font-medium hover:bg-surface-raised"
              >
                Import students
              </Link>
            </div>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          title="No students match these filters."
          description="Try a different search or clear the filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table aria-label="Students">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Class / Program</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={routes.portal.student(s.id)}
                        className="font-medium text-primary underline"
                      >
                        {s.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.studentCode}</TableCell>
                    <TableCell>{s.branchName}</TableCell>
                    <TableCell>
                      {s.currentClassName
                        ? `${s.currentClassName} · ${s.currentProgramName ?? ""}`
                        : "Not enrolled"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status]}>
                        {STUDENT_STATUS_LABELS[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={routes.portal.student(s.id)}
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

          <nav
            aria-label="Students pagination"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
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
              <Button
                variant="subtle"
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) })}
              >
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

      <AddStudentDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
