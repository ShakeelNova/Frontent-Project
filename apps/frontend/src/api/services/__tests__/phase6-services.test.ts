import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockAttendance } from "@/api/mock/mock-attendance";
import { __resetMockDevices } from "@/api/mock/mock-devices";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSchool } from "@/api/mock/mock-school";
import { __resetMockStaff } from "@/api/mock/mock-staff";
import {
  decideLeave,
  getStaffAttendance,
  getStudentAttendance,
  listCorrectionRequests,
  markStudentAttendance,
  qrCheckIn,
  startQrSession,
} from "@/api/services/attendance";
import { signIn } from "@/api/services/auth";
import {
  listDevices,
  registerDevice,
  removeDevice,
  updateDevice,
} from "@/api/services/devices";
import {
  approveStaff,
  assignBranch,
  assignRole,
  getStaff,
  inviteStaff,
  listStaff,
  removeBranch,
  removeRole,
  setStaffActive,
} from "@/api/services/staff";
import { beforeEach, describe, expect, it } from "vitest";

const ORG = "org-sunrise";
const CLASS_ID = "sun-cls-g10a";

beforeEach(async () => {
  resetAuthSession();
  __resetMockPortal();
  __resetMockSchool();
  __resetMockStaff();
  __resetMockAttendance();
  __resetMockDevices();
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
});

describe("staff directory (mock transport)", () => {
  it("paginates with totals and filters by status/branch", async () => {
    const page1 = await listStaff(ORG, { page: 1, pageSize: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.total).toBeGreaterThan(5);

    const invited = await listStaff(ORG, { page: 1, pageSize: 50, status: "invited" });
    expect(invited.items.map((s) => s.id)).toContain("staff-sun-invited");
    expect(invited.items.every((s) => s.status === "invited")).toBe(true);

    const north = await listStaff(ORG, {
      page: 1,
      pageSize: 50,
      branchId: "br-sunrise-north",
    });
    expect(north.items.map((s) => s.id)).toContain("staff-sun-pending");
    // Branch filter = any branch assignment (multi-branch staff appear).
    const all = await listStaff(ORG, { page: 1, pageSize: 50 });
    expect(north.total).toBeLessThan(all.total);
    for (const s of north.items) {
      const detail = await getStaff(ORG, s.id);
      expect(detail.branchIds).toContain("br-sunrise-north");
    }
  });

  it("Fresh org directory is empty (real empty state, not fake rows)", async () => {
    const res = await listStaff("org-fresh", { page: 1, pageSize: 10 });
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it("invite creates an invited record; duplicate email is blocked by the backend seam", async () => {
    const created = await inviteStaff(ORG, {
      email: "new.teacher@inbox.test",
      fullName: ["New", "Teacher"].join(" "),
      branchId: "br-sunrise-main",
      roleKey: "teacher",
    });
    expect(created.status).toBe("invited");
    await expect(
      inviteStaff(ORG, {
        email: "new.teacher@inbox.test",
        fullName: "Duplicate",
        branchId: "br-sunrise-main",
        roleKey: "teacher",
      }),
    ).rejects.toMatchObject({ code: "INVITE_ALREADY_EXISTS" });
  });

  it("pending approval can be approved; deactivation/reactivation round-trips", async () => {
    const approved = await approveStaff(ORG, "staff-sun-pending");
    expect(approved.approvalState).toBe("approved");
    expect(approved.status).toBe("active");

    const off = await setStaffActive(ORG, "staff-sun-pending", false);
    expect(off.status).toBe("inactive");
    const on = await setStaffActive(ORG, "staff-sun-pending", true);
    expect(on.status).toBe("active");
  });

  it("protects the last active owner and the caller's own account", async () => {
    await expect(removeRole(ORG, "staff-sun-self", "owner")).rejects.toMatchObject({
      code: "LAST_OWNER",
    });
    await expect(setStaffActive(ORG, "staff-sun-self", false)).rejects.toBeTruthy();
  });

  it("branch managers cannot change roles (backend authorization wins)", async () => {
    const riv = await listStaff("org-riverdale", { page: 1, pageSize: 1, status: "active" });
    const target = riv.items[0]!;
    await expect(assignRole("org-riverdale", target.id, "teacher")).rejects.toMatchObject({
      code: "ROLE_CHANGE_FORBIDDEN",
    });
  });

  it("role and branch assignment mutate the detail", async () => {
    const before = await getStaff(ORG, "staff-sun-2");
    expect(before.roles.map((r) => r.key)).not.toContain("front_desk");
    const withRole = await assignRole(ORG, "staff-sun-2", "front_desk");
    expect(withRole.roles.map((r) => r.key)).toContain("front_desk");

    const withBranch = await assignBranch(ORG, "staff-sun-2", "br-sunrise-north");
    expect(withBranch.branchIds).toContain("br-sunrise-north");
    const without = await removeBranch(ORG, "staff-sun-2", "br-sunrise-north");
    expect(without.branchIds).not.toContain("br-sunrise-north");
  });
});

describe("student attendance (mock transport)", () => {
  it("batch marks persist and the summary comes back from the backend", async () => {
    const day = await getStudentAttendance(ORG, "2026-10-20", CLASS_ID);
    expect(day.rows.length).toBeGreaterThan(0);
    expect(day.summary.total).toBe(day.rows.length);

    const updated = await markStudentAttendance(ORG, "2026-10-20", CLASS_ID, [
      { studentId: day.rows[0]!.studentId, status: "present" },
      { studentId: day.rows[1]!.studentId, status: "late" },
    ]);
    expect(updated.summary.present).toBe(1);
    expect(updated.summary.late).toBe(1);
    expect(updated.rows.find((r) => r.studentId === day.rows[0]!.studentId)?.markedVia).toBe(
      "manual",
    );
  });

  it("future dates are rejected with a field error", async () => {
    const day = await getStudentAttendance(ORG, "2026-10-20", CLASS_ID);
    await expect(
      markStudentAttendance(ORG, "2999-01-01", CLASS_ID, [
        { studentId: day.rows[0]!.studentId, status: "present" },
      ]),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("QR check-in marks present via qr; duplicates and bad tokens are backend errors", async () => {
    const day = await getStudentAttendance(ORG, "2026-10-21", CLASS_ID);
    const student = day.rows[0]!;
    const session = await startQrSession(ORG, CLASS_ID, "2026-10-21");
    expect(session.code).toMatch(/^FLX-/);

    const after = await qrCheckIn(ORG, session.id, student.studentCode);
    expect(after.checkIns.map((c) => c.studentId)).toContain(student.studentId);

    await expect(qrCheckIn(ORG, session.id, student.studentCode)).rejects.toMatchObject({
      code: "ALREADY_CHECKED_IN",
    });
    await expect(qrCheckIn(ORG, session.id, "NOPE-404")).rejects.toMatchObject({
      status: 422,
    });

    const dayAfter = await getStudentAttendance(ORG, "2026-10-21", CLASS_ID);
    const row = dayAfter.rows.find((r) => r.studentId === student.studentId);
    expect(row?.status).toBe("present");
    expect(row?.markedVia).toBe("qr");
  });
});

describe("staff attendance + requests (mock transport)", () => {
  it("backend flags drive day statuses (late/missing rendered verbatim)", async () => {
    const day = await getStaffAttendance(ORG, "2026-10-20");
    const statuses = day.rows.map((r) => r.dayStatus);
    expect(statuses).toContain("late");
    expect(statuses).toContain("missing_punch");
    expect(statuses).toContain("absent");
    const total =
      day.summary.present +
      day.summary.late +
      day.summary.absent +
      day.summary.on_leave +
      day.summary.missing_punch;
    expect(total).toBe(day.summary.total);
    const late = day.rows.find((r) => r.dayStatus === "late");
    expect(late?.flags.some((f) => f.toLowerCase().includes("late"))).toBe(true);
  });

  it("seeded requests are listed and an approved leave changes the day", async () => {
    const corrections = await listCorrectionRequests(ORG);
    expect(corrections.some((c) => c.id === "corr-sun-1" && c.status === "pending")).toBe(true);

    const leaves = await decideLeave(ORG, "leave-sun-1", "approved");
    expect(leaves.find((l) => l.id === "leave-sun-1")?.status).toBe("approved");
  });
});

describe("devices (mock transport)", () => {
  it("only backend-verified devices report verified; K50 truth is preserved", async () => {
    const devices = await listDevices(ORG);
    const k50 = devices.find((d) => d.type === "biometric_k50");
    expect(k50).toBeDefined();
    expect(k50?.status).not.toBe("verified");
    const verified = devices.filter((d) => d.status === "verified");
    expect(verified.every((d) => d.lastHeartbeatUtc !== null)).toBe(true);
  });

  it("registration always starts not_configured with no heartbeat; updates/remove work", async () => {
    const created = await registerDevice(ORG, {
      name: "Back gate tablet",
      type: "tablet",
      branchId: "br-sunrise-main",
    });
    expect(created.status).toBe("not_configured");
    expect(created.lastHeartbeatUtc).toBeNull();

    const updated = await updateDevice(ORG, created.id, { mode: "both" });
    expect(updated.mode).toBe("both");

    await removeDevice(ORG, created.id);
    const after = await listDevices(ORG);
    expect(after.map((d) => d.id)).not.toContain(created.id);
  });

  it("Fresh org has no devices", async () => {
    expect(await listDevices("org-fresh")).toEqual([]);
  });
});
