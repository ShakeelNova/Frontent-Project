import { mockSettingsApi } from "@/api/mock/mock-settings";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Settings service seam (Phase 7): roles & permissions metadata and
 * account security. Assumed endpoints (CR-009):
 *   GET   /organizations/{orgId}/roles-permissions
 *   PATCH /organizations/{orgId}/roles/{roleKey}/permissions
 *   POST  /auth/change-password
 *   GET   /auth/sessions
 *   DELETE /auth/sessions/{sessionId}
 *   POST  /auth/sessions/revoke-others
 *
 * Permission metadata is backend-provided; the UI renders exactly what
 * the API returns and never invents capabilities. The backend still
 * authorizes every operation — a ticked box here is a request, and
 * system roles (Owner) are locked server-side.
 */

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export interface RolePermissions {
  roleKey: string;
  roleLabel: string;
  /** System roles can't be edited (backend-enforced). */
  system: boolean;
  memberCount: number;
  permissions: Record<string, boolean>;
}

export interface RolesPermissions {
  catalog: PermissionDef[];
  roles: RolePermissions[];
}

export interface UserSession {
  id: string;
  deviceLabel: string;
  locationLabel: string;
  lastActiveUtc: string;
  current: boolean;
}

/**
 * Deferred-integration flags (Phase 8). The UI renders exactly what the
 * API reports: anything not "enabled" shows truthful not-enabled copy —
 * no fake connect buttons, no simulated flows. Assumed endpoint:
 * GET /organizations/{orgId}/integrations.
 */
export type IntegrationStatus = "enabled" | "not_enabled" | "coming_soon";

export interface IntegrationFlag {
  key: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  /** API-provided explanation rendered next to the status. */
  noteLabel: string;
}

const FEATURE = "Settings";

export async function getRolesPermissions(
  organizationId: string,
): Promise<RolesPermissions> {
  if (getApiTransport() === "mock")
    return mockSettingsApi.getRolesPermissions(organizationId);
  return contractUnavailable(FEATURE);
}
export async function updateRolePermissions(
  organizationId: string,
  roleKey: string,
  permissions: Record<string, boolean>,
): Promise<RolesPermissions> {
  if (getApiTransport() === "mock")
    return mockSettingsApi.updateRolePermissions(organizationId, roleKey, permissions);
  return contractUnavailable(FEATURE);
}
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  if (getApiTransport() === "mock") return mockSettingsApi.changePassword(input);
  return contractUnavailable(FEATURE);
}
export async function listSessions(): Promise<UserSession[]> {
  if (getApiTransport() === "mock") return mockSettingsApi.listSessions();
  return contractUnavailable(FEATURE);
}
export async function revokeSession(sessionId: string): Promise<UserSession[]> {
  if (getApiTransport() === "mock") return mockSettingsApi.revokeSession(sessionId);
  return contractUnavailable(FEATURE);
}
export async function revokeOtherSessions(): Promise<UserSession[]> {
  if (getApiTransport() === "mock") return mockSettingsApi.revokeOtherSessions();
  return contractUnavailable(FEATURE);
}
export async function getIntegrationFlags(
  organizationId: string,
): Promise<IntegrationFlag[]> {
  if (getApiTransport() === "mock") return mockSettingsApi.getIntegrationFlags(organizationId);
  return contractUnavailable(FEATURE);
}
