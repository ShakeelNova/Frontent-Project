import { mockPortalApi } from "@/api/mock/mock-portal";
import { getApiTransport } from "@/api/transport";

/**
 * Organization/branch membership seam (Phase 4).
 * Assumed endpoints (CR-006): GET /auth/organizations,
 * GET /organizations/{orgId}/branches. Role is per-organization.
 * Client role/branch lists are display conveniences only — the backend
 * authorizes every operation and may still return 401/403.
 */

export type OrgRole = "owner" | "general_manager" | "branch_manager" | "staff";

export interface OrganizationSummary {
  id: string;
  name: string;
  role: OrgRole;
  roleLabel: string;
}

export interface BranchSummary {
  id: string;
  organizationId: string;
  name: string;
}

export async function getMyOrganizations(): Promise<OrganizationSummary[]> {
  if (getApiTransport() === "mock") return mockPortalApi.getMyOrganizations();
  // TODO(contract): apiClient().GET("/auth/organizations")
  // Pre-contract: no memberships are knowable — portal shows the 0-org state
  // rather than inventing organizations.
  return [];
}

export async function getBranches(
  organizationId: string,
): Promise<BranchSummary[]> {
  if (getApiTransport() === "mock") return mockPortalApi.getBranches(organizationId);
  // TODO(contract): apiClient().GET(branches path, X-Organization-Id set by client)
  return [];
}
