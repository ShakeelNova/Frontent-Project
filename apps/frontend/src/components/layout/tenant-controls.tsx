"use client";

import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";

/**
 * Top-bar tenant scope controls. Native selects keep this keyboard- and
 * screen-reader-friendly without custom menu machinery. Switching org
 * resets the branch and refetches all org-scoped queries (query keys
 * include the org/branch ids). Backend re-authorizes regardless.
 */
export function TenantControls() {
  const {
    organizations,
    currentOrganization,
    selectOrganization,
    branches,
    currentBranch,
    selectBranch,
    isLoadingBranches,
  } = useTenant();

  if (!currentOrganization) {
    return (
      <p className="hidden text-sm text-muted sm:block">
        Organization: <span className="font-medium text-text">Not selected</span>
      </p>
    );
  }

  const isBranchManager = currentOrganization.role === "branch_manager";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {organizations.length > 1 ? (
        <>
          <label htmlFor="org-switcher" className="sr-only">
            Switch organization
          </label>
          <Select
            id="org-switcher"
            className="min-h-9 w-auto max-w-48 py-1.5"
            value={currentOrganization.id}
            onChange={(e) => selectOrganization(e.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <p className="truncate text-sm">
          <span className="sr-only">Organization:</span>
          <span className="font-medium">{currentOrganization.name}</span>
        </p>
      )}

      <Badge variant="info" className="hidden lg:inline-flex">
        {currentOrganization.roleLabel}
      </Badge>

      <>
        <label htmlFor="branch-switcher" className="sr-only">
          Switch branch
        </label>
        <Select
          id="branch-switcher"
          className="min-h-9 w-auto max-w-44 py-1.5"
          value={currentBranch?.id ?? ""}
          disabled={isLoadingBranches || branches.length === 0}
          onChange={(e) =>
            selectBranch(e.target.value === "" ? null : e.target.value)
          }
        >
          {!isBranchManager ? <option value="">All branches</option> : null}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
          {branches.length === 0 ? <option value="">No branches yet</option> : null}
        </Select>
      </>
    </div>
  );
}
