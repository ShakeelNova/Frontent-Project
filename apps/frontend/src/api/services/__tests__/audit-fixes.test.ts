import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockAttendance } from "@/api/mock/mock-attendance";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockStaff } from "@/api/mock/mock-staff";
import { getStaffAttendance } from "@/api/services/attendance";
import { signIn } from "@/api/services/auth";
import { submitPilotRequest } from "@/api/services/pilot";
import { getOrgProfile, uploadOrganizationLogo } from "@/api/services/setup";
import { listDepartments } from "@/api/services/staff";
import { beforeEach, describe, expect, it } from "vitest";

const ORG = "org-sunrise";

function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

beforeEach(async () => {
  resetAuthSession();
  __resetMockPortal();
  __resetMockStaff();
  __resetMockAttendance();
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
});

describe("audit fix: organization logo upload (backend file seam)", () => {
  it("returns an API-issued storage URL and persists it on the profile", async () => {
    const { logoUrl } = await uploadOrganizationLogo(
      ORG,
      fakeFile("My Logo.PNG", "image/png", 120_000),
    );
    expect(logoUrl).toBe(
      `https://storage.fluxeaze.test/org-logos/${ORG}/My-Logo.PNG`,
    );
    const profile = await getOrgProfile(ORG);
    expect(profile.logoUrl).toBe(logoUrl);
  });

  it("rejects non-image files with a `logo` field error", async () => {
    await expect(
      uploadOrganizationLogo(ORG, fakeFile("notes.pdf", "application/pdf", 100)),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { logo: expect.stringContaining("PNG") },
    });
  });

  it("rejects files over the 1 MB backend cap", async () => {
    await expect(
      uploadOrganizationLogo(ORG, fakeFile("big.png", "image/png", 2_000_000)),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { logo: expect.stringContaining("1 MB") },
    });
  });
});

describe("audit fix: staff attendance department dimension", () => {
  it("rows carry department names and the department filter narrows rows + summary", async () => {
    const departments = await listDepartments(ORG);
    expect(departments.length).toBeGreaterThan(0);
    const date = "2026-10-15";

    const all = await getStaffAttendance(ORG, date);
    expect(all.rows.length).toBeGreaterThan(0);
    expect(all.rows.every((r) => "departmentName" in r)).toBe(true);

    const target = departments[0]!;
    const filtered = await getStaffAttendance(ORG, date, undefined, target.id);
    expect(filtered.rows.length).toBeGreaterThan(0);
    expect(
      filtered.rows.every((r) => r.departmentName === target.name),
    ).toBe(true);
    expect(filtered.summary.total).toBe(filtered.rows.length);
    expect(filtered.rows.length).toBeLessThan(all.rows.length);
  });

  it("an unknown department matches nobody instead of erroring", async () => {
    const res = await getStaffAttendance(ORG, "2026-10-15", undefined, "dept-none");
    expect(res.rows).toHaveLength(0);
    expect(res.summary.total).toBe(0);
  });
});

describe("audit fix: pilot server-error scenario", () => {
  it("@demo-outage.test produces a 500, other emails succeed", async () => {
    const base = {
      organizationName: "Outage Academy",
      contactName: "Sara Ali",
      country: "Pakistan",
      timezone: "Asia/Karachi",
      institutionType: "school" as const,
      studentCountBand: "101-500",
    };
    await expect(
      submitPilotRequest({ ...base, email: "ops@demo-outage.test" }),
    ).rejects.toMatchObject({ status: 500 });
    const ok = await submitPilotRequest({ ...base, email: "ops@outage-academy.test" });
    expect(ok.reference).toBeTruthy();
  });
});
