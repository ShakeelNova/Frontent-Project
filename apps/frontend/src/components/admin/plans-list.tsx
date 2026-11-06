"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { listPlans } from "@/api/services/admin-catalog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

/** Plan catalogue: families with their currently published version. */
export function PlansList() {
  const query = useQuery({ queryKey: queryKeys.admin.plans, queryFn: listPlans });

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || query.data.length === 0) {
    return (
      <EmptyState
        title="No plans in the catalogue"
        description="The backend hasn't defined any subscription plans yet."
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {query.data.map((plan) => (
        <li key={plan.id}>
          <Card className="h-full">
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-h5 font-semibold">{plan.name}</p>
                {plan.publishedVersionLabel ? (
                  <Badge variant="success">Published: {plan.publishedVersionLabel}</Badge>
                ) : (
                  <Badge variant="warning">Nothing published</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              <p className="mt-2 text-sm text-muted">
                {plan.versionCount} version(s) · key <code className="font-mono">{plan.key}</code>
              </p>
              <p className="mt-3">
                <Link
                  href={routes.admin.plan(plan.id)}
                  className="text-sm font-medium text-primary underline"
                >
                  Manage versions →
                </Link>
              </p>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
