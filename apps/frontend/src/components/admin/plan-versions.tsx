"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createPlanDraft,
  listPlanVersions,
  listPlans,
} from "@/api/services/admin-catalog";
import { VersionStatusBadge } from "@/components/admin/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** One plan's version list with draft creation (clone or from scratch). */
export function PlanVersions({ planId }: { planId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: queryKeys.admin.plans, queryFn: listPlans });
  const versionsQuery = useQuery({
    queryKey: queryKeys.admin.planVersions(planId),
    queryFn: () => listPlanVersions(planId),
  });

  const draftMutation = useMutation({
    mutationFn: (cloneFromVersionId?: string) => createPlanDraft(planId, cloneFromVersionId),
    onSuccess: async (draft) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans });
      toast({ title: "Draft created", description: `Version ${draft.versionNumber} is ready to edit.`, variant: "success" });
      router.push(routes.admin.planVersion(planId, draft.id));
    },
    onError: (error) =>
      toast({ title: normalizeApiError(error).friendlyTitle, description: normalizeApiError(error).friendlyDescription, variant: "error" }),
  });

  const plan = plansQuery.data?.find((p) => p.id === planId);

  if (versionsQuery.isLoading || plansQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (versionsQuery.isError) {
    return <ErrorState error={versionsQuery.error} onRetry={() => versionsQuery.refetch()} />;
  }
  const versions = versionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>{plan ? `${plan.name} — versions` : "Plan versions"}</h1>
          <p className="mt-1 text-muted">
            {plan?.tagline ?? ""} Lifecycle: draft → preview → approved →
            published. Only drafts are editable; publishing retires the
            previous published version and never changes sold snapshots.
          </p>
        </div>
        <Button isLoading={draftMutation.isPending} onClick={() => draftMutation.mutate(undefined)}>
          New draft from scratch
        </Button>
      </div>

      {versions.length === 0 ? (
        <EmptyState
          title="No versions yet"
          description="Create the first draft to define price, allowances and entitlements for this plan."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Base price</TableHead>
              <TableHead>Effective from</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                <TableCell>
                  <VersionStatusBadge status={v.status} />
                </TableCell>
                <TableCell>
                  {v.basePriceMinor === null
                    ? "Custom pricing"
                    : `${formatMoney(v.basePriceMinor, v.currency)} / ${v.billingPeriod}`}
                </TableCell>
                <TableCell>
                  {v.effectiveFromUtc ? formatPlainDate(v.effectiveFromUtc.slice(0, 10)) : "—"}
                </TableCell>
                <TableCell>
                  {formatPlainDate(v.updatedAtUtc.slice(0, 10))} · {v.updatedByLabel}
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-3">
                    <Link
                      href={routes.admin.planVersion(planId, v.id)}
                      className="font-medium text-primary underline"
                      aria-label={`Open version ${v.versionNumber}`}
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      className="font-medium text-primary underline"
                      disabled={draftMutation.isPending}
                      onClick={() => draftMutation.mutate(v.id)}
                    >
                      Clone to draft
                    </button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p>
        <Link href={routes.admin.plans} className="text-sm font-medium text-primary underline">
          ← All plans
        </Link>
      </p>
    </div>
  );
}
