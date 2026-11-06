import { mockPortalApi } from "@/api/mock/mock-portal";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Guided-setup seam (Phase 4). Assumed endpoints (CR-006):
 * GET/PATCH /organizations/{orgId}/setup (+ profile/preferences sub-resources).
 * Checklist completion always originates from backend metadata — the
 * frontend never marks steps done locally.
 */

export interface SetupStatus {
  organizationId: string;
  profileComplete: boolean;
  hasBranches: boolean;
  timezoneCurrencySet: boolean;
  academicYearSet: boolean;
  staffOnboarded: boolean;
  studentsOnboarded: boolean;
}

export interface OrgProfile {
  name: string;
  contactEmail: string;
  contactPhone: string;
  /** Postal/campus address (Phase 7 settings, CR-009). */
  address: string;
  /** Logo URL as stored by the backend; upload widgets come with storage APIs. */
  logoUrl: string;
}

export interface OrgPreferences {
  timezone: string;
  currency: string;
  /** Phase 7 academic preferences (assumed contract fields, CR-009). */
  gradingScheme: "percentage" | "letter";
  /** Minutes after start that the BACKEND uses to flag "late". */
  lateThresholdMinutes: number;
}

/** Richer branch record for Settings → Branches (CR-009). */
export interface BranchDetail {
  id: string;
  name: string;
  code: string;
  location: string;
  status: "active" | "disabled";
}

export interface UpdateBranchInput {
  name: string;
  code: string;
  location: string;
  status: "active" | "disabled";
}

export interface AcademicYearBasics {
  label: string;
  startsOn: string;
  endsOn: string;
}

export async function getSetupStatus(
  organizationId: string,
): Promise<SetupStatus> {
  if (getApiTransport() === "mock") return mockPortalApi.getSetupStatus(organizationId);
  return contractUnavailable("Organization setup");
}

export async function getOrgProfile(
  organizationId: string,
): Promise<OrgProfile> {
  if (getApiTransport() === "mock") return mockPortalApi.getOrgProfile(organizationId);
  return contractUnavailable("Organization settings");
}

export async function updateOrgProfile(
  organizationId: string,
  profile: OrgProfile,
): Promise<void> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.updateOrgProfile(organizationId, profile);
  }
  return contractUnavailable("Organization settings");
}

/**
 * Uploads an organization logo through the backend file API and returns
 * the stored URL the API issues. The frontend never invents storage URLs
 * and never persists arbitrary public links as the logo. Assumed
 * endpoint: POST /organizations/{orgId}/logo (multipart). The backend
 * owns the file rules (image types, size cap); violations come back as
 * field errors on `logo`. File contents are never logged.
 */
export async function uploadOrganizationLogo(
  organizationId: string,
  file: File,
): Promise<{ logoUrl: string }> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.uploadOrgLogo(organizationId, file);
  }
  return contractUnavailable("Organization settings");
}

export async function getOrgPreferences(
  organizationId: string,
): Promise<OrgPreferences> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.getOrgPreferences(organizationId);
  }
  return contractUnavailable("Organization settings");
}

export async function updateOrgPreferences(
  organizationId: string,
  preferences: OrgPreferences,
): Promise<void> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.updateOrgPreferences(organizationId, preferences);
  }
  return contractUnavailable("Organization settings");
}

export async function getAcademicYearBasics(
  organizationId: string,
): Promise<AcademicYearBasics> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.getAcademicYearBasics(organizationId);
  }
  return contractUnavailable("Organization settings");
}

export async function updateAcademicYearBasics(
  organizationId: string,
  basics: AcademicYearBasics,
): Promise<void> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.updateAcademicYearBasics(organizationId, basics);
  }
  return contractUnavailable("Organization settings");
}

export async function createBranch(
  organizationId: string,
  input: { name: string },
): Promise<void> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.createBranch(organizationId, input);
  }
  return contractUnavailable("Organization settings");
}

export async function listBranchDetails(
  organizationId: string,
): Promise<BranchDetail[]> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.listBranchDetails(organizationId);
  }
  return contractUnavailable("Organization settings");
}

export async function updateBranch(
  organizationId: string,
  branchId: string,
  input: UpdateBranchInput,
): Promise<BranchDetail> {
  if (getApiTransport() === "mock") {
    return mockPortalApi.updateBranch(organizationId, branchId, input);
  }
  return contractUnavailable("Organization settings");
}
