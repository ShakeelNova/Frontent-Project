"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PlanCard } from "@/components/marketing/plan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedPlans } from "@/api/services/plans";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

function PlansSkeleton() {
  return (
    <div role="status" aria-label="Loading plans" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

const REQUEST_PILOT_CTA = (
  <Link
    href={routes.requestPilot}
    className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
  >
    Request a pilot
  </Link>
);

/**
 * Pricing states (spec): loading skeleton → published plans → honest empty
 * state when the API has no published plan versions → recoverable error.
 * Prices/allowances render exactly as the API returns them.
 */
export function PricingPlans() {
  const query = useQuery({
    queryKey: queryKeys.publicPlans,
    queryFn: getPublishedPlans,
    staleTime: 5 * 60_000,
  });

  if (query.isPending) return <PlansSkeleton />;

  if (query.isError) {
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const result = query.data;
  if (result.kind === "unavailable" || result.plans.length === 0) {
    return (
      <EmptyState
        title="Plans are being prepared"
        description="Published pricing isn't available yet. Request a pilot for early access to Fluxeaze — we'll share plan details as soon as they're published."
        action={REQUEST_PILOT_CTA}
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {result.plans.map((plan) => (
        <li key={plan.id}>
          <PlanCard plan={plan} />
        </li>
      ))}
    </ul>
  );
}
