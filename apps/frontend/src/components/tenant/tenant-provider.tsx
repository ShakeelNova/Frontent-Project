"use client";

import { queryKeys } from "@/api/query-keys";

import {
  clearTenantContext,
  setTenantContext,
} from "@/api/client";
import {
  getBranches,
  getMyOrganizations,
  type BranchSummary,
  type OrganizationSummary,
} from "@/api/services/organizations";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ORG_STORAGE_KEY = "fluxeaze-active-org";
const BRANCH_STORAGE_KEY = "fluxeaze-active-branch";

export interface TenantContextValue {
  organizations: OrganizationSummary[];
  isLoadingOrganizations: boolean;
  organizationsError: unknown;
  refetchOrganizations: () => void;
  currentOrganization: OrganizationSummary | null;
  selectOrganization: (organizationId: string) => void;
  branches: BranchSummary[];
  isLoadingBranches: boolean;
  /** Null branch = "All branches" (org-wide view, owner/GM only in UI). */
  currentBranch: BranchSummary | null;
  selectBranch: (branchId: string | null) => void;
  hasNoOrganizations: boolean;
  needsOrgSelection: boolean;
}

const TenantReactContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantReactContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>.");
  return ctx;
}

function readSessionValue(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* selection simply won't survive reloads */
  }
}

/**
 * Tenant (organization + branch) context. Selection is a display scope
 * only — ids are forwarded as X-Organization-Id / X-Branch-Id headers by
 * the central API client, and the backend re-authorizes every request.
 * Persisted in sessionStorage (non-sensitive ids; cleared with the tab and
 * on sign-out). A single-org user is auto-selected; multi-org users pick
 * via /auth/organizations.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readSessionValue(ORG_STORAGE_KEY),
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readSessionValue(BRANCH_STORAGE_KEY),
  );

  const orgsQuery = useQuery({
    queryKey: queryKeys.auth.organizationsFor(user?.id ?? "anon"),
    queryFn: getMyOrganizations,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const organizations = useMemo(
    () => orgsQuery.data ?? [],
    [orgsQuery.data],
  );

  // Signed out → wipe stored tenant scope + API headers. Derivation below
  // already yields no current org (the organizations query is disabled).
  useEffect(() => {
    if (!user) {
      writeSessionValue(ORG_STORAGE_KEY, null);
      writeSessionValue(BRANCH_STORAGE_KEY, null);
      clearTenantContext();
    }
  }, [user]);

  // Derived effective organization: a lone organization auto-selects; a
  // stored/selected id counts only while still authorized by the backend.
  const currentOrganization = useMemo(() => {
    if (organizations.length === 1) return organizations[0] ?? null;
    return organizations.find((o) => o.id === selectedOrgId) ?? null;
  }, [organizations, selectedOrgId]);

  const branchesQuery = useQuery({
    queryKey: queryKeys.organization.branches(currentOrganization?.id),
    queryFn: () => {
      if (!currentOrganization) {
        throw new Error("Branches query ran without an organization.");
      }
      return getBranches(currentOrganization.id);
    },
    enabled: Boolean(currentOrganization),
    staleTime: 60_000,
  });
  const branches = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  );

  // Derived effective branch: a selected id counts only while backend-
  // allowed; branch managers default (\"pin\") to their first allowed
  // branch, owners/GMs default to the org-wide (\"All branches\") view.
  const currentBranch = useMemo(() => {
    const selected = selectedBranchId
      ? branches.find((b) => b.id === selectedBranchId) ?? null
      : null;
    if (selected) return selected;
    if (currentOrganization?.role === "branch_manager") {
      return branches[0] ?? null;
    }
    return null;
  }, [branches, selectedBranchId, currentOrganization]);

  // Keep API-client tenant headers in sync with the selection.
  useEffect(() => {
    if (currentOrganization) {
      setTenantContext({
        organizationId: currentOrganization.id,
        branchId: currentBranch?.id,
      });
    } else {
      clearTenantContext();
    }
  }, [currentOrganization, currentBranch]);

  const selectOrganization = useCallback((organizationId: string) => {
    setSelectedOrgId(organizationId);
    setSelectedBranchId(null);
    writeSessionValue(ORG_STORAGE_KEY, organizationId);
    writeSessionValue(BRANCH_STORAGE_KEY, null);
  }, []);

  const selectBranch = useCallback((branchId: string | null) => {
    setSelectedBranchId(branchId);
    writeSessionValue(BRANCH_STORAGE_KEY, branchId);
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      organizations,
      isLoadingOrganizations: orgsQuery.isPending && Boolean(user),
      organizationsError: orgsQuery.error,
      refetchOrganizations: () => void orgsQuery.refetch(),
      currentOrganization,
      selectOrganization,
      branches,
      isLoadingBranches: branchesQuery.isPending && Boolean(currentOrganization),
      currentBranch,
      selectBranch,
      hasNoOrganizations:
        Boolean(user) && orgsQuery.isSuccess && organizations.length === 0,
      needsOrgSelection:
        Boolean(user) &&
        orgsQuery.isSuccess &&
        organizations.length > 1 &&
        !currentOrganization,
    }),
    [
      organizations,
      orgsQuery,
      user,
      currentOrganization,
      selectOrganization,
      branches,
      branchesQuery.isPending,
      currentBranch,
      selectBranch,
    ],
  );

  return (
    <TenantReactContext.Provider value={value}>
      {children}
    </TenantReactContext.Provider>
  );
}
