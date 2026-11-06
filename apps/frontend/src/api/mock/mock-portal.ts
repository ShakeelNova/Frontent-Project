/**
 * DEV/TEST-ONLY portal fixtures (Phase 4) — organizations, branches,
 * dashboards, guided setup. Enabled only via NEXT_PUBLIC_API_TRANSPORT=mock.
 * State is module-memory (setup edits persist until reload). Assumed
 * endpoints are logged as CR-006 in BACKEND_INTEGRATION_REPORT.md.
 *
 * Demo owner memberships (owner@demo.fluxeaze.test):
 * - org-sunrise  "Sunrise Academy"     Owner,           62% capacity, 2 branches
 * - org-northgate "Northgate College"  General Manager, 85% capacity (≥80 warning), 3 branches
 * - org-riverdale "Riverdale Coaching" Branch Manager (1 of 3 branches), 100% capacity (full)
 * - org-fresh    "Fresh Start Institute" Owner,         brand-new empty org (setup incomplete)
 * noorg@fluxeaze.test has no memberships (0-org state).
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import type { AuthUser } from "@/api/services/auth";
import type {
  BranchDashboardData,
  DateRange,
  OrgDashboardData,
} from "@/api/services/dashboards";
import type {
  BranchSummary,
  OrganizationSummary,
} from "@/api/services/organizations";
import type {
  AcademicYearBasics,
  OrgPreferences,
  OrgProfile,
  SetupStatus,
} from "@/api/services/setup";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

function requireSession(): AuthUser {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  return user!;
}

interface OrgFixture extends OrganizationSummary {
  currency: string;
  capacityLimit: number | null;
  profile: OrgProfile;
  preferences: OrgPreferences;
  academicYear: AcademicYearBasics;
  setup: Omit<SetupStatus, "organizationId">;
}

interface BranchFixture extends BranchSummary {
  activeStudents: number;
  totalStaff: number;
  attendancePercent: number | null;
  outstandingFeesMinor: number;
  overdueVouchers: number;
  /** Role-gated visibility for the demo owner (branch-manager scoping). */
  visibleToDemoUser: boolean;
  /** Phase 7 settings fields (CR-009). */
  code: string;
  location: string;
  status: "active" | "disabled";
}

function makeOrgs(): Record<string, OrgFixture> {
  const base = {
    contactEmail: "admin@institute.test",
    contactPhone: "+92 300 1234567",
    address: "",
    logoUrl: "",
  };
  return {
    "org-sunrise": {
      id: "org-sunrise",
      name: "Sunrise Academy",
      role: "owner",
      roleLabel: "Owner",
      currency: "PKR",
      capacityLimit: 1200,
      profile: { name: "Sunrise Academy", ...base },
      preferences: { timezone: "Asia/Karachi", currency: "PKR", gradingScheme: "percentage", lateThresholdMinutes: 15 },
      academicYear: { label: "2026–27", startsOn: "2026-08-01", endsOn: "2027-05-31" },
      setup: {
        profileComplete: true,
        hasBranches: true,
        timezoneCurrencySet: true,
        academicYearSet: true,
        staffOnboarded: true,
        studentsOnboarded: true,
      },
    },
    "org-northgate": {
      id: "org-northgate",
      name: "Northgate College",
      role: "general_manager",
      roleLabel: "General Manager",
      currency: "PKR",
      capacityLimit: 2000,
      profile: { name: "Northgate College", ...base },
      preferences: { timezone: "Asia/Karachi", currency: "PKR", gradingScheme: "percentage", lateThresholdMinutes: 15 },
      academicYear: { label: "2026–27", startsOn: "2026-09-01", endsOn: "2027-06-30" },
      setup: {
        profileComplete: true,
        hasBranches: true,
        timezoneCurrencySet: true,
        academicYearSet: false,
        staffOnboarded: true,
        studentsOnboarded: true,
      },
    },
    "org-riverdale": {
      id: "org-riverdale",
      name: "Riverdale Coaching",
      role: "branch_manager",
      roleLabel: "Branch Manager",
      currency: "PKR",
      // Org total across ALL branches (incl. ones hidden from the BM) = 670 → 100%.
      capacityLimit: 670,
      profile: { name: "Riverdale Coaching", ...base },
      preferences: { timezone: "Asia/Karachi", currency: "PKR", gradingScheme: "percentage", lateThresholdMinutes: 15 },
      academicYear: { label: "2026–27", startsOn: "2026-08-15", endsOn: "2027-05-15" },
      setup: {
        profileComplete: true,
        hasBranches: true,
        timezoneCurrencySet: true,
        academicYearSet: true,
        staffOnboarded: true,
        studentsOnboarded: true,
      },
    },
    "org-fresh": {
      id: "org-fresh",
      name: "Fresh Start Institute",
      role: "owner",
      roleLabel: "Owner",
      currency: "USD",
      capacityLimit: 300,
      profile: { name: "Fresh Start Institute", contactEmail: "", contactPhone: "", address: "", logoUrl: "" },
      preferences: { timezone: "UTC", currency: "USD", gradingScheme: "percentage", lateThresholdMinutes: 15 },
      academicYear: { label: "", startsOn: "", endsOn: "" },
      setup: {
        profileComplete: false,
        hasBranches: false,
        timezoneCurrencySet: false,
        academicYearSet: false,
        staffOnboarded: false,
        studentsOnboarded: false,
      },
    },
  };
}

function makeBranches(): BranchFixture[] {
  const b = (
    id: string,
    organizationId: string,
    name: string,
    activeStudents: number,
    totalStaff: number,
    attendancePercent: number | null,
    outstandingFeesMinor: number,
    overdueVouchers = 0,
    visibleToDemoUser = true,
  ): BranchFixture => ({
    id,
    organizationId,
    name,
    activeStudents,
    totalStaff,
    attendancePercent,
    outstandingFeesMinor,
    overdueVouchers,
    visibleToDemoUser,
    code: name.split(" ")[0]!.toUpperCase().slice(0, 4),
    location: "",
    status: "active",
  });
  return [
    b("br-sunrise-main", "org-sunrise", "Main campus", 480, 42, 93.5, 1_250_000, 12),
    b("br-sunrise-north", "org-sunrise", "North campus", 264, 25, 91.2, 640_000, 5),
    b("br-northgate-city", "org-northgate", "City branch", 720, 58, 90.1, 2_100_000, 21),
    b("br-northgate-west", "org-northgate", "West branch", 560, 44, 88.4, 1_480_000, 9),
    b("br-northgate-east", "org-northgate", "East branch", 420, 36, 92.0, 980_000, 7),
    b("br-riverdale-gulberg", "org-riverdale", "Gulberg branch", 400, 18, 89.7, 520_000, 14),
    // Not visible to the demo branch-manager (scoping proof):
    b("br-riverdale-clifton", "org-riverdale", "Clifton branch", 150, 9, 91.0, 210_000, 3, false),
    b("br-riverdale-nazimabad", "org-riverdale", "Nazimabad branch", 120, 8, 87.2, 160_000, 2, false),
  ];
}

let orgs = makeOrgs();
let branches = makeBranches();

/** Test helper: restores pristine portal fixtures between tests. */
export function __resetMockPortal(): void {
  orgs = makeOrgs();
  branches = makeBranches();
}

function membershipOf(orgId: string): OrgFixture {
  const user = requireSession();
  if (user.id === "mock-user-noorg" || user.isPlatformAdmin) {
    // Platform admins hold no tenant memberships — tenant endpoints 403.
    mockError(403, "ORG_FORBIDDEN", "User has no organization access.");
  }
  const org = orgs[orgId];
  if (!org) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return org;
}

export interface MockMembership {
  role: string;
  timezone: string;
  currency: string;
  capacityLimit: number | null;
  /** Dashboard-authoritative active-student total (all branches, incl. hidden). */
  activeStudentTotal: number;
  branches: { id: string; name: string; visibleToDemoUser: boolean }[];
}

/**
 * Shared Phase 5+ mock gate: resolves the demo user's membership for an
 * org (throws 401/403/404 like the real backend would). Student/academic
 * fixtures reuse it so role, scoping and capacity stay consistent with
 * the dashboards.
 */
export function getMockMembership(orgId: string): MockMembership {
  const org = membershipOf(orgId);
  const orgBranches = branches.filter((b) => b.organizationId === orgId);
  return {
    role: org.role,
    timezone: org.preferences.timezone,
    currency: org.currency,
    capacityLimit: org.capacityLimit,
    activeStudentTotal: orgBranches.reduce((sum, b) => sum + b.activeStudents, 0),
    branches: orgBranches.map((b) => ({
      id: b.id,
      name: b.name,
      visibleToDemoUser: b.visibleToDemoUser,
    })),
  };
}

export const mockPortalApi = {
  async getMyOrganizations(): Promise<OrganizationSummary[]> {
    await delay(100);
    const user = requireSession();
    // Guardians/students have no staff memberships — student area only.
    if (user.kind !== "staff") return [];
    // Platform admins have no tenant memberships — admin area only.
    if (user.isPlatformAdmin) return [];
    if (user.id === "mock-user-noorg") return [];
    return Object.values(orgs).map(({ id, name, role, roleLabel }) => ({
      id,
      name,
      role,
      roleLabel,
    }));
  },

  async getBranches(organizationId: string): Promise<BranchSummary[]> {
    await delay(100);
    membershipOf(organizationId);
    return branches
      .filter((b) => b.organizationId === organizationId && b.visibleToDemoUser)
      .map(({ id, organizationId: orgId, name }) => ({ id, organizationId: orgId, name }));
  },

  async getOrgDashboard(
    organizationId: string,
    range: DateRange,
  ): Promise<OrgDashboardData> {
    await delay();
    const org = membershipOf(organizationId);
    if (org.role === "branch_manager") {
      // Org-wide metrics are owner/GM territory; backend is the authority.
      mockError(403, "DASHBOARD_FORBIDDEN", "Org-wide dashboard requires Owner or GM role.");
    }
    const visible = branches.filter(
      (b) => b.organizationId === organizationId && b.visibleToDemoUser,
    );
    const activeStudents = visible.reduce((s, b) => s + b.activeStudents, 0);
    const totalStaff = visible.reduce((s, b) => s + b.totalStaff, 0);
    const outstanding = visible.reduce((s, b) => s + b.outstandingFeesMinor, 0);
    const withAttendance = visible.filter((b) => b.attendancePercent !== null);
    const attendancePercent = withAttendance.length
      ? Math.round(
          (withAttendance.reduce((s, b) => s + (b.attendancePercent ?? 0), 0) /
            withAttendance.length) *
            10,
        ) / 10
      : null;
    const usagePercent =
      org.capacityLimit === null
        ? 0
        : Math.round((activeStudents / org.capacityLimit) * 1000) / 10;

    return {
      organizationId,
      currency: org.currency,
      range,
      activeStudents,
      totalStaff,
      attendancePercent,
      outstandingFeesMinor: outstanding,
      capacity: {
        activeStudents,
        capacityLimit: org.capacityLimit,
        usagePercent,
      },
      branches: visible
        .map((b) => ({
          branchId: b.id,
          branchName: b.name,
          activeStudents: b.activeStudents,
          attendancePercent: b.attendancePercent,
          outstandingFeesMinor: b.outstandingFeesMinor,
        }))
        .sort((a, b2) => b2.activeStudents - a.activeStudents),
      alerts:
        usagePercent >= 100
          ? ["Student capacity is full for this organization."]
          : usagePercent >= 90
            ? ["Student capacity is nearly full — plan an upgrade soon."]
            : usagePercent >= 80
              ? ["Student capacity is above 80%."]
              : [],
    };
  },

  async getBranchDashboard(
    organizationId: string,
    branchId: string,
    range: DateRange,
  ): Promise<BranchDashboardData> {
    await delay();
    const org = membershipOf(organizationId);
    const branch = branches.find(
      (b) => b.id === branchId && b.organizationId === organizationId,
    );
    if (!branch) mockError(404, "BRANCH_NOT_FOUND", "Branch not found.");
    if (!branch.visibleToDemoUser) {
      // Scoped-out branch: backend says no, however the UI got here.
      mockError(403, "BRANCH_FORBIDDEN", "Not authorized for this branch.");
    }
    return {
      organizationId,
      branchId: branch.id,
      branchName: branch.name,
      currency: org.currency,
      range,
      activeStudents: branch.activeStudents,
      totalStaff: branch.totalStaff,
      attendancePercent: branch.attendancePercent,
      outstandingFeesMinor: branch.outstandingFeesMinor,
      overdueVouchers: branch.overdueVouchers,
      capacity: (() => {
        const orgTotal = branches
          .filter((b) => b.organizationId === organizationId)
          .reduce((s, b) => s + b.activeStudents, 0);
        return {
          activeStudents: orgTotal,
          capacityLimit: org.capacityLimit,
          usagePercent:
            org.capacityLimit === null
              ? 0
              : Math.round((orgTotal / org.capacityLimit) * 1000) / 10,
        };
      })(),
    };
  },

  async getSetupStatus(organizationId: string): Promise<SetupStatus> {
    await delay(100);
    const org = membershipOf(organizationId);
    return { organizationId, ...org.setup };
  },

  async getOrgProfile(organizationId: string): Promise<OrgProfile> {
    await delay(100);
    return { ...membershipOf(organizationId).profile };
  },

  async updateOrgProfile(
    organizationId: string,
    profile: OrgProfile,
  ): Promise<void> {
    await delay();
    const org = membershipOf(organizationId);
    org.profile = { ...profile };
    org.name = profile.name;
    org.setup.profileComplete = Boolean(
      profile.name.trim() && profile.contactEmail.trim(),
    );
  },

  async uploadOrgLogo(
    organizationId: string,
    file: { name: string; type: string; size: number },
  ): Promise<{ logoUrl: string }> {
    await delay();
    const org = membershipOf(organizationId);
    // Backend file rules (mock mirror): images only, ≤ 1 MB. Only the
    // file metadata is inspected — contents are never read or logged.
    const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!ALLOWED.includes(file.type)) {
      throw {
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        requestId: "mock-validation",
        fieldErrors: { logo: "Use a PNG, JPG, WebP or SVG image." },
      };
    }
    if (file.size > 1_000_000) {
      throw {
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        requestId: "mock-validation",
        fieldErrors: { logo: "Logo must be 1 MB or smaller." },
      };
    }
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
    const logoUrl = `https://storage.fluxeaze.test/org-logos/${organizationId}/${safeName}`;
    org.profile = { ...org.profile, logoUrl };
    return { logoUrl };
  },

  async getOrgPreferences(organizationId: string): Promise<OrgPreferences> {
    await delay(100);
    return { ...membershipOf(organizationId).preferences };
  },

  async updateOrgPreferences(
    organizationId: string,
    preferences: OrgPreferences,
  ): Promise<void> {
    await delay();
    const org = membershipOf(organizationId);
    org.preferences = { ...preferences };
    org.currency = preferences.currency;
    org.setup.timezoneCurrencySet = true;
  },

  async getAcademicYearBasics(
    organizationId: string,
  ): Promise<AcademicYearBasics> {
    await delay(100);
    return { ...membershipOf(organizationId).academicYear };
  },

  async updateAcademicYearBasics(
    organizationId: string,
    basics: AcademicYearBasics,
  ): Promise<void> {
    await delay();
    const org = membershipOf(organizationId);
    org.academicYear = { ...basics };
    org.setup.academicYearSet = Boolean(basics.startsOn && basics.endsOn);
  },

  async createBranch(
    organizationId: string,
    input: { name: string },
  ): Promise<void> {
    await delay();
    const org = membershipOf(organizationId);
    const id = `br-${organizationId}-${branches.length + 1}`;
    branches = [
      ...branches,
      {
        id,
        organizationId,
        name: input.name,
        activeStudents: 0,
        totalStaff: 0,
        attendancePercent: null,
        outstandingFeesMinor: 0,
        overdueVouchers: 0,
        visibleToDemoUser: true,
        code: input.name.split(" ")[0]!.toUpperCase().slice(0, 4),
        location: "",
        status: "active",
      },
    ];
    org.setup.hasBranches = true;
  },

  async listBranchDetails(organizationId: string) {
    await delay(100);
    membershipOf(organizationId);
    return branches
      .filter((b) => b.organizationId === organizationId && b.visibleToDemoUser)
      .map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        location: b.location,
        status: b.status,
      }));
  },

  async updateBranch(
    organizationId: string,
    branchId: string,
    input: { name: string; code: string; location: string; status: "active" | "disabled" },
  ) {
    await delay();
    const org = membershipOf(organizationId);
    if (org.role === "branch_manager") {
      mockError(403, "FORBIDDEN", "Branch managers can't edit branch settings.");
    }
    const branch = branches.find(
      (b) => b.id === branchId && b.organizationId === organizationId,
    );
    if (!branch) mockError(404, "BRANCH_NOT_FOUND", "Branch not found.");
    Object.assign(branch!, {
      name: input.name,
      code: input.code,
      location: input.location,
      status: input.status,
    });
    return {
      id: branch!.id,
      name: branch!.name,
      code: branch!.code,
      location: branch!.location,
      status: branch!.status,
    };
  },
};


/* Persistence seam */
export function __serialize(): unknown {
  return { orgs, branches };
}

export function __restore(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const value = snapshot as { orgs?: unknown; branches?: unknown };
  if (Array.isArray(value.orgs)) orgs = value.orgs as unknown as typeof orgs;
  if (Array.isArray(value.branches)) branches = value.branches as unknown as typeof branches;
}
