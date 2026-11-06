/**
 * Full demo-journey verification.
 *
 * The unit suites test each module in isolation; this suite walks the same
 * deterministic mock transport end-to-end for all three personas (staff
 * owner, guardian, platform admin) and touches every read surface a real
 * user can reach. It is the guard that keeps the demo/preview honest: if a
 * service is unwired, a fixture is missing, or a module throws, this fails.
 */
import { __resetMockAdmin } from "@/api/mock/mock-admin";
import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockAttendance } from "@/api/mock/mock-attendance";
import { __resetMockDevices } from "@/api/mock/mock-devices";
import { __resetMockFees } from "@/api/mock/mock-fees";
import { __resetMockImports } from "@/api/mock/mock-imports";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSchool } from "@/api/mock/mock-school";
import { __resetMockSettings } from "@/api/mock/mock-settings";
import { __resetMockStaff } from "@/api/mock/mock-staff";
import { __resetMockSubscriptions } from "@/api/mock/mock-subscription";
import {
  getTimetable,
  listAcademicYears,
  listClasses,
  listPrograms,
  listSubjects,
} from "@/api/services/academics";
import {
  getAdminOverview,
  listAddons,
  listAuditEvents,
  listPlanMargins,
  listPlanVersions,
  listPlans,
  listProviderRates,
  listQuoteRules,
  listQuotes,
  listResourceDefinitions,
  listSupplyPools,
} from "@/api/services/admin-catalog";
import {
  getStaffAttendance,
  getStudentAttendance,
  listCorrectionRequests,
  listLeaveRequests,
} from "@/api/services/attendance";
import { signIn } from "@/api/services/auth";
import { getBranchDashboard, getOrgDashboard } from "@/api/services/dashboards";
import { listDevices } from "@/api/services/devices";
import { getFeesReport, getVoucher, listFeeStructures, listVouchers } from "@/api/services/fees";
import { getHelpArticle } from "@/api/services/help";
import { getImportFields, getImportTemplate, listImports } from "@/api/services/imports";
import { getInvite } from "@/api/services/invites";
import { getBranches, getMyOrganizations } from "@/api/services/organizations";
import { getPublishedPlans } from "@/api/services/plans";
import { getRolesPermissions, getIntegrationFlags, listSessions } from "@/api/services/settings";
import {
  getAcademicYearBasics,
  getOrgPreferences,
  getOrgProfile,
  getSetupStatus,
  listBranchDetails,
} from "@/api/services/setup";
import { getStaff, listDepartments, listDesignations, listRoles, listStaff } from "@/api/services/staff";
import { getStudent, listStudents } from "@/api/services/students";
import {
  getMyNotices,
  getMyStudentAttendance,
  getMyStudentFees,
  getMyStudentResults,
  getMyStudentTimetable,
  getMyStudents,
} from "@/api/services/student-portal";
import { getOrgSubscription } from "@/api/services/subscription";
import { toISODate } from "@/lib/dates";
import { beforeEach, describe, expect, it } from "vitest";

function first<T>(items: T[], label: string): T {
  const item = items[0];
  if (!item) throw new Error(`Expected at least one ${label}`);
  return item;
}

function resetAll(): void {
  resetAuthSession();
  __resetMockPortal();
  __resetMockSchool();
  __resetMockStaff();
  __resetMockAttendance();
  __resetMockDevices();
  __resetMockFees();
  __resetMockImports();
  __resetMockSettings();
  __resetMockSubscriptions();
  __resetMockAdmin();
}

beforeEach(resetAll);

describe("demo journey — staff/owner (every tenant module)", () => {
  it("reads dashboards, students, staff, academics, attendance, fees, imports, settings, billing and help", async () => {
    const user = await signIn({
      email: "owner@demo.fluxeaze.test",
      password: "password123",
    });
    expect(user.kind).toBe("staff");

    const organizations = await getMyOrganizations();
    expect(organizations.length).toBe(4);
    const organization = organizations.find((o) => o.id === "org-sunrise");
    if (!organization) throw new Error("Sunrise Academy fixture missing");
    const branches = await getBranches(organization.id);
    expect(branches.length).toBeGreaterThan(0);
    const branch = first(branches, "branch");

    const today = toISODate(new Date());
    const range = { preset: "week" as const, from: today, to: today };

    const dashboard = await getOrgDashboard(organization.id, range);
    expect(dashboard.activeStudents).toBeGreaterThan(0);
    const branchDashboard = await getBranchDashboard(organization.id, branch.id, range);
    expect(branchDashboard.branchId).toBe(branch.id);

    const studentPage = await listStudents(organization.id, { page: 1, pageSize: 5 });
    expect(studentPage.total).toBeGreaterThan(0);
    const student = first(studentPage.items, "student");
    const studentDetail = await getStudent(organization.id, student.id);
    expect(studentDetail.id).toBe(student.id);

    const staffPage = await listStaff(organization.id, { page: 1, pageSize: 5 });
    const staffMember = first(staffPage.items, "staff member");
    const staffDetail = await getStaff(organization.id, staffMember.id);
    expect(staffDetail.id).toBe(staffMember.id);
    expect((await listRoles(organization.id)).length).toBeGreaterThan(0);
    expect((await listDepartments(organization.id)).length).toBeGreaterThan(0);
    expect((await listDesignations(organization.id)).length).toBeGreaterThan(0);

    const years = await listAcademicYears(organization.id);
    const programs = await listPrograms(organization.id);
    const classes = await listClasses(organization.id);
    const subjects = await listSubjects(organization.id);
    expect(years.length).toBeGreaterThan(0);
    expect(programs.length).toBeGreaterThan(0);
    expect(classes.length).toBeGreaterThan(0);
    expect(subjects.length).toBeGreaterThan(0);
    const classGroup = first(classes, "class");
    expect(Array.isArray(await getTimetable(organization.id, classGroup.id))).toBe(true);

    const studentAttendance = await getStudentAttendance(
      organization.id,
      today,
      classGroup.id,
    );
    expect(studentAttendance.rows.length).toBeGreaterThan(0);
    const staffAttendance = await getStaffAttendance(organization.id, today);
    expect(staffAttendance.rows.length).toBeGreaterThan(0);
    expect(Array.isArray(await listCorrectionRequests(organization.id))).toBe(true);
    expect(Array.isArray(await listLeaveRequests(organization.id))).toBe(true);

    const structures = await listFeeStructures(organization.id);
    expect(structures.length).toBeGreaterThan(0);
    const voucherPage = await listVouchers(organization.id, { page: 1, pageSize: 5 });
    expect(voucherPage.total).toBeGreaterThan(0);
    const voucher = first(voucherPage.items, "voucher");
    expect((await getVoucher(organization.id, voucher.id)).id).toBe(voucher.id);
    expect(
      (await getFeesReport(organization.id, range.from, range.to)).totalOutstandingMinor,
    ).toBeGreaterThanOrEqual(0);

    expect((await listDevices(organization.id)).length).toBeGreaterThan(0);
    expect(Array.isArray(await listImports(organization.id))).toBe(true);
    expect((await getImportFields(organization.id, "students")).length).toBeGreaterThan(0);
    expect((await getImportTemplate(organization.id, "students")).length).toBeGreaterThan(0);

    expect(await getSetupStatus(organization.id)).toBeDefined();
    expect(await getOrgProfile(organization.id)).toBeDefined();
    expect(await getOrgPreferences(organization.id)).toBeDefined();
    expect(await getAcademicYearBasics(organization.id)).toBeDefined();
    expect((await listBranchDetails(organization.id)).length).toBeGreaterThan(0);

    expect(await getRolesPermissions(organization.id)).toBeDefined();
    expect((await listSessions()).length).toBeGreaterThan(0);
    expect((await getIntegrationFlags(organization.id)).length).toBeGreaterThan(0);

    const subscription = await getOrgSubscription(organization.id);
    expect(subscription).not.toBeNull();
    expect(subscription?.planVersionLabel).toBeTruthy();
    expect(await getHelpArticle("students")).not.toBeNull();

    const plans = await getPublishedPlans();
    expect(plans.kind).toBe("ok");
    expect((await getInvite("ready-token")).status).toBe("ready");
  }, 30_000);
});

describe("demo journey — guardian (student/parent area)", () => {
  it("reads only the students linked to the session", async () => {
    await signIn({ email: "guardian@demo.fluxeaze.test", password: "password123" });
    const students = await getMyStudents();
    expect(students.length).toBe(2);
    const student = first(students, "linked student");
    expect(await getMyStudentAttendance(student.id)).toBeDefined();
    expect(await getMyStudentTimetable(student.id)).toBeDefined();
    expect(Array.isArray(await getMyStudentFees(student.id))).toBe(true);
    expect(Array.isArray(await getMyNotices(student.id))).toBe(true);
    expect(await getMyStudentResults(student.id)).toBeDefined();
  });
});

describe("demo journey — platform admin", () => {
  it("reads the plan catalogue, rates, pools, margins, quotes and audit", async () => {
    await signIn({ email: "admin@fluxeaze.test", password: "password123" });
    expect(await getAdminOverview()).toBeDefined();
    const plans = await listPlans();
    expect(plans.length).toBeGreaterThan(0);
    const plan = first(plans, "plan");
    expect((await listPlanVersions(plan.id)).length).toBeGreaterThan(0);
    expect((await listResourceDefinitions()).length).toBeGreaterThan(0);
    expect((await listProviderRates()).length).toBeGreaterThan(0);
    expect((await listSupplyPools()).length).toBeGreaterThan(0);
    expect((await listPlanMargins()).length).toBeGreaterThan(0);
    expect((await listQuoteRules()).length).toBeGreaterThan(0);
    expect((await listQuotes()).length).toBeGreaterThan(0);
    expect((await listAuditEvents()).length).toBeGreaterThan(0);
    expect((await listAddons()).length).toBeGreaterThan(0);
  });
});
