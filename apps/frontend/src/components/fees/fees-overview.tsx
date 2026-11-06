"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getFeesReport } from "@/api/services/fees";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
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
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fees overview/reports (Phase 7). Every aggregate is backend-computed
 * for the selected period — the UI only formats minor units with the
 * API's currency.
 */
export function FeesOverview() {
  const { currentOrganization, branches } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const from = searchParams.get("from") ?? monthStart();
  const to = searchParams.get("to") ?? todayLocal();
  const branchId = searchParams.get("branch") ?? "";

  const query = useQuery({
    queryKey: queryKeys.fees.report(orgId, from, to, branchId),
    queryFn: () => getFeesReport(orgId, from, to, branchId || undefined),
    enabled: Boolean(orgId),
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const report = query.data;
  const currency = report?.currency ?? "";

  return (
    <section aria-labelledby="fees-overview-heading">
      <h2 id="fees-overview-heading" className="text-h4">
        Collections &amp; outstanding
      </h2>
      <p className="mt-1 text-sm text-muted">
        Backend report for the selected period. Collections count payments
        dated in the period; outstanding counts vouchers issued up to the
        end date.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="fees-from" className="mb-1.5 block text-sm font-medium">
            From
          </label>
          <Input
            id="fees-from"
            type="date"
            value={from}
            onChange={(e) => e.target.value && setParam("from", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fees-to" className="mb-1.5 block text-sm font-medium">
            To
          </label>
          <Input
            id="fees-to"
            type="date"
            value={to}
            onChange={(e) => e.target.value && setParam("to", e.target.value)}
          />
        </div>
        <div className="min-w-52">
          <label htmlFor="fees-branch" className="mb-1.5 block text-sm font-medium">
            Branch
          </label>
          <Select
            id="fees-branch"
            value={branchId}
            onChange={(e) => setParam("branch", e.target.value)}
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
          <div role="status" aria-label="Loading fees report" className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : report && report.rows.length === 0 ? (
          <EmptyState
            title="No fee activity yet"
            description="Create a fee structure and generate vouchers — collections and outstanding balances will appear here."
            action={
              <Link
                href={routes.portal.feesStructures}
                className="font-medium text-primary underline"
              >
                Go to fee structures →
              </Link>
            }
          />
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label={`Collected (${from} → ${to})`}
                value={formatMoney(report.totalCollectedMinor, currency)}
              />
              <MetricCard
                label="Outstanding balance"
                value={formatMoney(report.totalOutstandingMinor, currency)}
                href={routes.portal.feesVouchers}
              />
              <MetricCard
                label="Overdue"
                value={formatMoney(report.totalOverdueMinor, currency)}
                href={routes.portal.feesVouchersOverdue}
              />
            </div>
            <Table aria-label="Fees by branch">
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Vouchers</TableHead>
                  <TableHead>Settled</TableHead>
                  <TableHead>Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((r) => (
                  <TableRow key={r.branchName}>
                    <TableCell className="font-medium">{r.branchName}</TableCell>
                    <TableCell>{formatMoney(r.collectedMinor, currency)}</TableCell>
                    <TableCell>{formatMoney(r.outstandingMinor, currency)}</TableCell>
                    <TableCell>{r.voucherCount}</TableCell>
                    <TableCell>{r.settledCount}</TableCell>
                    <TableCell>{r.overdueCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : null}
      </div>
    </section>
  );
}
