import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { signIn } from "@/api/services/auth";
import { getBranchDashboard, getOrgDashboard } from "@/api/services/dashboards";
import { getBranches, getMyOrganizations } from "@/api/services/organizations";
import {
  createBranch,
  getSetupStatus,
  updateOrgPreferences,
} from "@/api/services/setup";
import { beforeEach, describe, expect, it } from "vitest";

const RANGE = { preset: "week" as const, from: "2026-10-19", to: "2026-10-25" };

beforeEach(async () => {
  resetAuthSession();
  __resetMockPortal();
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
});

describe("portal services (mock transport)", () => {
  it("demo user belongs to 4 organizations with distinct roles", async () => {
    const orgs = await getMyOrganizations();
    expect(orgs.map((o) => o.id)).toEqual([
      "org-sunrise",
      "org-northgate",
      "org-riverdale",
      "org-fresh",
    ]);
    expect(orgs.find((o) => o.id === "org-riverdale")?.role).toBe("branch_manager");
  });

  it("noorg user gets zero organizations", async () => {
    resetAuthSession();
    await signIn({ email: "noorg@fluxeaze.test", password: "password123" });
    expect(await getMyOrganizations()).toEqual([]);
  });

  it("branch manager only receives their authorized branches", async () => {
    const branches = await getBranches("org-riverdale");
    expect(branches.map((b) => b.id)).toEqual(["br-riverdale-gulberg"]);
  });

  it("org dashboard is 403 for branch managers (backend is authority)", async () => {
    await expect(getOrgDashboard("org-riverdale", RANGE)).rejects.toMatchObject({
      code: "DASHBOARD_FORBIDDEN",
    });
  });

  it("hidden branch dashboard is 403 for branch managers", async () => {
    await expect(
      getBranchDashboard("org-riverdale", "br-riverdale-clifton", RANGE),
    ).rejects.toMatchObject({ code: "BRANCH_FORBIDDEN" });
  });

  it("northgate capacity is 85% with a warning alert", async () => {
    const data = await getOrgDashboard("org-northgate", RANGE);
    expect(data.capacity.usagePercent).toBe(85);
    expect(data.capacity.activeStudents).toBe(1700);
    expect(data.capacity.capacityLimit).toBe(2000);
    expect(data.alerts.some((a) => /capacity/i.test(a))).toBe(true);
    expect(data.branches).toHaveLength(3);
  });

  it("riverdale branch dashboard still carries org-wide 100% capacity", async () => {
    const data = await getBranchDashboard("org-riverdale", "br-riverdale-gulberg", RANGE);
    expect(data.capacity.usagePercent).toBe(100);
    expect(data.activeStudents).toBe(400);
  });

  it("fresh org dashboard is empty (zeroed metrics)", async () => {
    const data = await getOrgDashboard("org-fresh", RANGE);
    expect(data.activeStudents).toBe(0);
    expect(data.branches).toEqual([]);
  });

  it("unknown organization is rejected server-side", async () => {
    await expect(getOrgDashboard("org-nope", RANGE)).rejects.toMatchObject({
      code: "ORG_NOT_FOUND",
    });
  });

  it("setup mutations flip completion flags (fresh org starts incomplete)", async () => {
    const before = await getSetupStatus("org-fresh");
    expect(before).toMatchObject({
      profileComplete: false,
      timezoneCurrencySet: false,
      academicYearSet: false,
      hasBranches: false,
    });
    await updateOrgPreferences("org-fresh", {
      timezone: "Asia/Karachi",
      currency: "PKR",
      gradingScheme: "percentage",
      lateThresholdMinutes: 15,
    });
    await createBranch("org-fresh", { name: "Main campus" });
    const after = await getSetupStatus("org-fresh");
    expect(after.timezoneCurrencySet).toBe(true);
    expect(after.hasBranches).toBe(true);
    const branches = await getBranches("org-fresh");
    expect(branches.map((b) => b.name)).toContain("Main campus");
  });
});
