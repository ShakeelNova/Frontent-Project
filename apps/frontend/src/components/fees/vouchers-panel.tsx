"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  listVouchers,
  VOUCHER_STATUS_LABELS,
  type VoucherStatus,
} from "@/api/services/fees";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
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
import { formatMoney } from "@/lib/money";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_VARIANT: Record<VoucherStatus, "success" | "warning" | "error" | "info"> = {
  due: "info",
  partially_paid: "warning",
  overdue: "error",
  settled: "success",
};

export function statusBadge(status: VoucherStatus) {
  return <Badge variant={STATUS_VARIANT[status]}>{VOUCHER_STATUS_LABELS[status]}</Badge>;
}

export function VouchersPanel() {
  const { currentOrganization, branches } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const qParam = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const branchId = searchParams.get("branch") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? "10") || 10));

  const [searchInput, setSearchInput] = useState(qParam);

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qParam) setParams({ q: searchInput || null, page: "1" });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useQuery({
    queryKey: queryKeys.fees.vouchers(orgId, qParam, status, branchId, page, pageSize),
    queryFn: () =>
      listVouchers(orgId, {
        page,
        pageSize,
        search: qParam || undefined,
        status: (status as VoucherStatus) || undefined,
        branchId: branchId || undefined,
      }),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(qParam || status || branchId);

  return (
    <section aria-labelledby="vouchers-heading">
      <h2 id="vouchers-heading" className="text-h4">
        Vouchers
      </h2>
      <p className="mt-1 text-sm text-muted">
        {currentOrganization?.name} · {total} voucher(s). Statuses and
        balances are computed by the backend.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="voucher-search" className="mb-1.5 block text-sm font-medium">
            Search student, code or voucher №
          </label>
          <Input
            id="voucher-search"
            type="search"
            placeholder="e.g. Ayesha or VCH-2026-1001"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="voucher-status" className="mb-1.5 block text-sm font-medium">
            Status
          </label>
          <Select
            id="voucher-status"
            value={status}
            onChange={(e) => setParams({ status: e.target.value || null, page: "1" })}
          >
            <option value="">All statuses</option>
            {(Object.keys(VOUCHER_STATUS_LABELS) as VoucherStatus[]).map((s) => (
              <option key={s} value={s}>
                {VOUCHER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="voucher-branch" className="mb-1.5 block text-sm font-medium">
            Branch
          </label>
          <Select
            id="voucher-branch"
            value={branchId}
            onChange={(e) => setParams({ branch: e.target.value || null, page: "1" })}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <div role="status" aria-label="Loading vouchers" className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No vouchers match" : "No vouchers yet"}
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : "Generate vouchers from a fee structure to start collecting."
            }
            action={
              hasFilters ? (
                <Button
                  variant="subtle"
                  onClick={() => {
                    setSearchInput("");
                    setParams({ q: null, status: null, branch: null, page: "1" });
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link href={routes.portal.feesStructures} className="font-medium text-primary underline">
                  Go to fee structures →
                </Link>
              )
            }
          />
        ) : (
          <>
            <Table aria-label="Vouchers">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Voucher ID</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <span className="font-medium">{v.studentName}</span>
                      <span className="block font-mono text-xs text-muted">
                        {v.studentCode} · {v.periodLabel}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{v.voucherNumber}</TableCell>
                    <TableCell>{v.dueDate}</TableCell>
                    <TableCell>{formatMoney(v.amountMinor, v.currency)}</TableCell>
                    <TableCell>{formatMoney(v.paidMinor, v.currency)}</TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(v.balanceMinor, v.currency)}
                    </TableCell>
                    <TableCell>{statusBadge(v.status)}</TableCell>
                    <TableCell>
                      <Link
                        href={routes.portal.feesVoucher(v.id)}
                        className="text-sm font-medium text-primary underline"
                        aria-label={`View voucher ${v.voucherNumber}`}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <nav
              aria-label="Voucher pagination"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <p className="text-muted" aria-live="polite">
                Page {page} of {totalPages} · {total.toLocaleString()} total
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-muted">Rows</span>
                  <Select
                    aria-label="Rows per page"
                    value={String(pageSize)}
                    onChange={(e) => setParams({ pageSize: e.target.value, page: "1" })}
                    className="w-20"
                  >
                    {[10, 25, 50].map((n) => (
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
      </div>
    </section>
  );
}
