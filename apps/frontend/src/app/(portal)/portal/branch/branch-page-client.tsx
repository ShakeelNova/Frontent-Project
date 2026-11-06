"use client";

import { BranchDashboardView } from "@/components/dashboard/branch-dashboard-view";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { EmptyState } from "@/components/feedback/empty-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Card, CardBody } from "@/components/ui/card";
import { resolveDateRange } from "@/lib/dates";
import { useSearchParams } from "next/navigation";

export function BranchPageClient() {
  const tenant = useTenant();
  const searchParams = useSearchParams();
  const range = resolveDateRange({
    preset: searchParams.get("preset"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  const org = tenant.currentOrganization;
  if (!org) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1>
            {tenant.currentBranch
              ? `${tenant.currentBranch.name} dashboard`
              : "Branch dashboard"}
          </h1>
          <p className="mt-1 text-muted">
            {org.name} · {range.from} → {range.to}. Only branches the backend
            authorizes for you are listed.
          </p>
        </div>
        <DateRangeFilter />
      </header>

      {!tenant.currentBranch ? (
        tenant.branches.length === 0 ? (
          <EmptyState
            title="No branches available"
            description="This organization has no branches you can access yet. Owners can add branches from Settings."
          />
        ) : (
          <section aria-label="Choose a branch">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.branches.map((branch) => (
                <li key={branch.id}>
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => tenant.selectBranch(branch.id)}
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardBody>
                        <p className="font-semibold">{branch.name}</p>
                        <p className="mt-1 text-sm font-medium text-primary">
                          Open branch dashboard →
                        </p>
                      </CardBody>
                    </Card>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : (
        <BranchDashboardView
          organizationId={org.id}
          branchId={tenant.currentBranch.id}
          range={range}
        />
      )}
    </div>
  );
}
