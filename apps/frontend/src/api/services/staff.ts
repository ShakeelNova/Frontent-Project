import { mockStaffApi } from "@/api/mock/mock-staff";
import type { PagedResult } from "@/api/services/students";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Staff service seam (Phase 6). Assumed endpoints (CR-008):
 *   GET    /organizations/{orgId}/staff                (paged, filters)
 *   GET    /organizations/{orgId}/staff/{id}
 *   PATCH  /organizations/{orgId}/staff/{id}           (profile/dept/designation)
 *   POST   /organizations/{orgId}/staff/invitations
 *   POST   /organizations/{orgId}/staff/{id}/approve | /reject
 *   POST   /organizations/{orgId}/staff/{id}/activate | /deactivate
 *   GET    /organizations/{orgId}/roles                (assignable catalog)
 *   POST/DELETE /organizations/{orgId}/staff/{id}/roles
 *   POST/DELETE /organizations/{orgId}/staff/{id}/branches
 *   GET    /organizations/{orgId}/departments · /designations
 * Role/permission decisions are the backend's: unauthorized changes come
 * back 403 (ROLE_CHANGE_FORBIDDEN) and the last owner is protected (409).
 */

export type StaffStatus = "invited" | "active" | "inactive";
export type ApprovalState = "none" | "pending" | "approved" | "rejected";

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  invited: "Invited",
  active: "Active",
  inactive: "Inactive",
};

export interface StaffRole {
  key: string;
  label: string;
}

export interface StaffSummary {
  id: string;
  staffCode: string;
  fullName: string;
  email: string;
  primaryBranchId: string;
  primaryBranchName: string;
  departmentName: string | null;
  designationName: string | null;
  roles: StaffRole[];
  status: StaffStatus;
  approvalState: ApprovalState;
}

export interface StaffAttendanceSummary {
  periodDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePercent: number;
}

export interface StaffDetail extends StaffSummary {
  phone: string | null;
  departmentId: string | null;
  designationId: string | null;
  branchIds: string[];
  branchNames: string[];
  invitedAt: string | null;
  joinedOn: string | null;
  /** True for the signed-in user's own staff record (self-protection UX). */
  isSelf: boolean;
  attendanceSummary: StaffAttendanceSummary;
}

export interface StaffListParams {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  status?: StaffStatus;
}

export interface InviteStaffInput {
  email: string;
  fullName: string;
  branchId: string;
  departmentId?: string;
  designationId?: string;
  roleKey: string;
}

export interface UpdateStaffInput {
  fullName: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
}

const FEATURE = "Staff";

export async function listStaff(
  organizationId: string,
  params: StaffListParams,
): Promise<PagedResult<StaffSummary>> {
  if (getApiTransport() === "mock") return mockStaffApi.listStaff(organizationId, params);
  return contractUnavailable(FEATURE);
}
export async function getStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.getStaff(organizationId, staffId);
  return contractUnavailable(FEATURE);
}
export async function updateStaff(
  organizationId: string,
  staffId: string,
  input: UpdateStaffInput,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.updateStaff(organizationId, staffId, input);
  return contractUnavailable(FEATURE);
}
export async function inviteStaff(
  organizationId: string,
  input: InviteStaffInput,
): Promise<StaffSummary> {
  if (getApiTransport() === "mock") return mockStaffApi.inviteStaff(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function approveStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.approveStaff(organizationId, staffId);
  return contractUnavailable(FEATURE);
}
export async function rejectStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.rejectStaff(organizationId, staffId);
  return contractUnavailable(FEATURE);
}
export async function setStaffActive(
  organizationId: string,
  staffId: string,
  active: boolean,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock")
    return active
      ? mockStaffApi.activateStaff(organizationId, staffId)
      : mockStaffApi.deactivateStaff(organizationId, staffId);
  return contractUnavailable(FEATURE);
}
export async function listRoles(organizationId: string): Promise<StaffRole[]> {
  if (getApiTransport() === "mock") return mockStaffApi.listRoles(organizationId);
  return contractUnavailable(FEATURE);
}
export async function assignRole(
  organizationId: string,
  staffId: string,
  roleKey: string,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.assignRole(organizationId, staffId, roleKey);
  return contractUnavailable(FEATURE);
}
export async function removeRole(
  organizationId: string,
  staffId: string,
  roleKey: string,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.removeRole(organizationId, staffId, roleKey);
  return contractUnavailable(FEATURE);
}
export async function assignBranch(
  organizationId: string,
  staffId: string,
  branchId: string,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.assignBranch(organizationId, staffId, branchId);
  return contractUnavailable(FEATURE);
}
export async function removeBranch(
  organizationId: string,
  staffId: string,
  branchId: string,
): Promise<StaffDetail> {
  if (getApiTransport() === "mock") return mockStaffApi.removeBranch(organizationId, staffId, branchId);
  return contractUnavailable(FEATURE);
}
export async function listDepartments(organizationId: string): Promise<CatalogItem[]> {
  if (getApiTransport() === "mock") return mockStaffApi.listDepartments(organizationId);
  return contractUnavailable(FEATURE);
}
export async function listDesignations(organizationId: string): Promise<CatalogItem[]> {
  if (getApiTransport() === "mock") return mockStaffApi.listDesignations(organizationId);
  return contractUnavailable(FEATURE);
}
