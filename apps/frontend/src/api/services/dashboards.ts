import { mockPortalApi } from "@/api/mock/mock-portal";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Dashboard metrics seam (Phase 4). Assumed endpoints (CR-006):
 * GET /organizations/{orgId}/dashboard?from&to,
 * GET /organizations/{orgId}/branches/{branchId}/dashboard?from&to.
 * Money is minor units + org currency; capacity comes from API policy —
 * the frontend only renders levels (see src/lib/capacity.ts).
 */

export interface DateRange {
  /** ISO date (yyyy-mm-dd), inclusive. */
  from: string;
  to: string;
  preset: "today" | "week" | "month" | "custom";
}

export interface CapacityInfo {
  activeStudents: number;
  /** Null = no fixed cap reported by the API for this org. */
  capacityLimit: number | null;
  /** 0–100+ as reported/computed by the API. */
  usagePercent: number;
}

export interface BranchMetricRow {
  branchId: string;
  branchName: string;
  activeStudents: number;
  attendancePercent: number | null;
  outstandingFeesMinor: number;
}

export interface OrgDashboardData {
  organizationId: string;
  currency: string;
  range: DateRange;
  activeStudents: number;
  totalStaff: number;
  attendancePercent: number | null;
  outstandingFeesMinor: number;
  capacity: CapacityInfo;
  branches: BranchMetricRow[];
  /** Free-form alert strings returned by the API (rendered verbatim). */
  alerts: string[];
}

export interface BranchDashboardData {
  organizationId: string;
  branchId: string;
  branchName: string;
  currency: string;
  range: DateRange;
  activeStudents: number;
  totalStaff: number;
  attendancePercent: number | null;
  outstandingFeesMinor: number;
  overdueVouchers: number;
  /** Org-wide capacity (branch managers still need the full warning). */
  capacity: CapacityInfo;
}

export async function getOrgDashboard(
  organizationId: string,
  range: DateRange,
): Promise<OrgDashboardData> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.getOrgDashboard(organizationId, range);
  }
  return contractUnavailable("Dashboards");
}

export async function getBranchDashboard(
  organizationId: string,
  branchId: string,
  range: DateRange,
): Promise<BranchDashboardData> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.getBranchDashboard(organizationId, branchId, range);
  }
  return contractUnavailable("Dashboards");
}
