/**
 * DEV/TEST-ONLY attendance fixtures (Phase 6) — student daily marking,
 * QR check-in sessions, staff punches/summaries, correction & leave
 * requests. Enabled only via NEXT_PUBLIC_API_TRANSPORT=mock. CR-008.
 *
 * This module plays the BACKEND: day statuses, late/missing flags and
 * summaries are computed HERE (as the real API would) — the frontend
 * only displays them. Times are UTC instants; the UI converts to the
 * org timezone. Manual + QR flows never depend on devices.
 */

import { getMockMembership } from "@/api/mock/mock-portal";
import {
  getMockClass,
  getMockClassRoster,
  getMockStudentByCode,
  mockRequireVisibleBranch,
} from "@/api/mock/mock-school";
import { getMockActiveStaff } from "@/api/mock/mock-staff";
import type {
  CorrectionInput,
  CorrectionRequest,
  LeaveInput,
  LeaveRequest,
  QrSession,
  StaffAttendanceDay,
  StaffAttendanceRow,
  StaffDayStatus,
  StudentAttendanceDay,
  StudentAttendanceStatus,
  StudentMark,
} from "@/api/services/attendance";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

function fieldError(field: string, message: string): never {
  throw {
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Validation failed.",
    requestId: "mock-validation",
    fieldErrors: { [field]: message },
  };
}

interface MarkRecord {
  status: StudentAttendanceStatus;
  via: "manual" | "qr" | "device";
  checkedInAtUtc: string | null;
}

interface AttendanceState {
  marks: Map<string, Map<string, MarkRecord>>;
  sessions: Map<string, QrSession & { organizationId: string }>;
  corrections: CorrectionRequest[];
  leaves: LeaveRequest[];
  seq: number;
}

function makeState(): Record<string, AttendanceState> {
  const empty = (): AttendanceState => ({
    marks: new Map(),
    sessions: new Map(),
    corrections: [],
    leaves: [],
    seq: 100,
  });
  const all: Record<string, AttendanceState> = {
    "org-sunrise": empty(),
    "org-northgate": empty(),
    "org-riverdale": empty(),
    "org-fresh": empty(),
  };
  const today = new Date().toISOString().slice(0, 10);
  all["org-sunrise"]!.corrections.push({
    id: "corr-sun-1",
    staffId: "staff-sun-3",
    staffName: "Pending correction (seed)",
    branchName: "Main campus",
    date: today,
    correctedIn: "08:05",
    correctedOut: null,
    reason: "Forgot to punch in — was in class from first period.",
    status: "pending",
    requestedAtUtc: new Date().toISOString(),
  });
  all["org-sunrise"]!.leaves.push({
    id: "leave-sun-1",
    staffId: "staff-sun-4",
    staffName: "Pending leave (seed)",
    branchName: "Main campus",
    from: today,
    to: today,
    reason: "Family commitment.",
    status: "pending",
    requestedAtUtc: new Date().toISOString(),
  });
  return all;
}

let state = makeState();

export function __resetMockAttendance(): void {
  state = makeState();
}

function stateOf(orgId: string): AttendanceState {
  getMockMembership(orgId);
  const s = state[orgId];
  if (!s) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return s;
}

function dayKey(classId: string, date: string): string {
  return `${classId}|${date}`;
}

function buildDay(
  orgId: string,
  s: AttendanceState,
  date: string,
  classId: string,
): StudentAttendanceDay {
  const klass = getMockClass(orgId, classId);
  const roster = getMockClassRoster(orgId, classId);
  const marks = s.marks.get(dayKey(classId, date)) ?? new Map<string, MarkRecord>();
  const rows = roster.map((r) => {
    const mark = marks.get(r.studentId);
    return {
      studentId: r.studentId,
      fullName: r.fullName,
      studentCode: r.studentCode,
      status: mark?.status ?? null,
      markedVia: mark?.via ?? null,
      checkedInAtUtc: mark?.checkedInAtUtc ?? null,
    };
  });
  const summary = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, total: rows.length };
  rows.forEach((r) => {
    if (r.status) summary[r.status]++;
    else summary.unmarked++;
  });
  return { date, classId, className: klass.name, branchName: klass.branchName, rows, summary };
}

function assertNotFuture(date: string): void {
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) fieldError("date", "Attendance can't be marked for a future date.");
}

function requireAttendanceManager(orgId: string): void {
  const m = getMockMembership(orgId);
  if (!["owner", "general_manager", "branch_manager"].includes(m.role)) {
    mockError(403, "FORBIDDEN", "Your role can't manage attendance.");
  }
}

export const mockAttendanceApi = {
  async getStudentAttendance(
    organizationId: string,
    date: string,
    classId: string,
  ): Promise<StudentAttendanceDay> {
    await delay();
    const s = stateOf(organizationId);
    return buildDay(organizationId, s, date, classId);
  },

  async markStudentAttendance(
    organizationId: string,
    date: string,
    classId: string,
    marks: StudentMark[],
  ): Promise<StudentAttendanceDay> {
    await delay();
    const s = stateOf(organizationId);
    requireAttendanceManager(organizationId);
    getMockClass(organizationId, classId); // branch-scope gate
    assertNotFuture(date);
    const key = dayKey(classId, date);
    const store = s.marks.get(key) ?? new Map<string, MarkRecord>();
    const rosterIds = new Set(getMockClassRoster(organizationId, classId).map((r) => r.studentId));
    marks.forEach((m) => {
      if (!rosterIds.has(m.studentId)) return;
      const existing = store.get(m.studentId);
      store.set(m.studentId, {
        status: m.status,
        via: existing?.via === "qr" ? "qr" : "manual",
        checkedInAtUtc: existing?.checkedInAtUtc ?? null,
      });
    });
    s.marks.set(key, store);
    return buildDay(organizationId, s, date, classId);
  },

  async startQrSession(
    organizationId: string,
    classId: string,
    date: string,
  ): Promise<QrSession> {
    await delay();
    const s = stateOf(organizationId);
    requireAttendanceManager(organizationId);
    const klass = getMockClass(organizationId, classId);
    assertNotFuture(date);
    const n = ++s.seq;
    const session: QrSession & { organizationId: string } = {
      id: `qr-${n}`,
      organizationId,
      code: `FLX-${String(1000 + (n % 9000))}`,
      date,
      classId,
      className: klass.name,
      expiresAtUtc: new Date(Date.now() + 2 * 3600_000).toISOString(),
      checkIns: [],
      rosterTotal: getMockClassRoster(organizationId, classId).length,
    };
    s.sessions.set(session.id, session);
    const { organizationId: _omit, ...pub } = session;
    void _omit;
    return structuredClone(pub);
  },

  async getQrSession(organizationId: string, sessionId: string): Promise<QrSession> {
    await delay(80);
    const s = stateOf(organizationId);
    const session = s.sessions.get(sessionId);
    if (!session) mockError(404, "QR_SESSION_NOT_FOUND", "QR session not found.");
    const { organizationId: _omit, ...pub } = session;
    void _omit;
    return structuredClone(pub);
  },

  async qrCheckIn(
    organizationId: string,
    sessionId: string,
    token: string,
  ): Promise<QrSession> {
    await delay();
    const s = stateOf(organizationId);
    const session = s.sessions.get(sessionId);
    if (!session) mockError(404, "QR_SESSION_NOT_FOUND", "QR session not found.");
    if (new Date(session.expiresAtUtc).getTime() < Date.now()) {
      mockError(410, "QR_SESSION_EXPIRED", "This QR session has ended.");
    }
    // Token = the student's code in the mock kiosk flow.
    const student = getMockStudentByCode(organizationId, token);
    if (!student) fieldError("token", "No student matches this code.");
    const roster = getMockClassRoster(organizationId, session.classId);
    if (!roster.some((r) => r.studentId === student.studentId)) {
      fieldError("token", "This student isn't on this class roster.");
    }
    if (session.checkIns.some((c) => c.studentId === student.studentId)) {
      mockError(409, "ALREADY_CHECKED_IN", "Student already checked in for this session.");
    }
    const now = new Date().toISOString();
    session.checkIns.push({ ...student, checkedInAtUtc: now });
    const key = dayKey(session.classId, session.date);
    const store = s.marks.get(key) ?? new Map<string, MarkRecord>();
    store.set(student.studentId, { status: "present", via: "qr", checkedInAtUtc: now });
    s.marks.set(key, store);
    const { organizationId: _omit, ...pub } = session;
    void _omit;
    return structuredClone(pub);
  },

  async getStaffAttendance(
    organizationId: string,
    date: string,
    branchId?: string,
    departmentId?: string,
  ): Promise<StaffAttendanceDay> {
    await delay();
    const s = stateOf(organizationId);
    if (branchId) mockRequireVisibleBranch(organizationId, branchId);
    const staff = getMockActiveStaff(organizationId).filter(
      (r) =>
        (!branchId || r.branchId === branchId) &&
        (!departmentId || r.departmentId === departmentId),
    );
    // The mock "backend" derives punches + flags deterministically; the
    // real API would compute these from device/manual punches and policy.
    const daySeed = [...date].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rows: StaffAttendanceRow[] = staff.map((r, i) => {
      const onApprovedLeave = s.leaves.some(
        (l) => l.staffId === r.id && l.status === "approved" && l.from <= date && date <= l.to,
      );
      const kind = (i + daySeed) % 10;
      let dayStatus: StaffDayStatus = "present";
      let firstInUtc: string | null = `${date}T03:0${i % 10}:00.000Z`;
      let lastOutUtc: string | null = `${date}T10:3${i % 6}:00.000Z`;
      const flags: string[] = [];
      if (onApprovedLeave) {
        dayStatus = "on_leave";
        firstInUtc = null;
        lastOutUtc = null;
        flags.push("Approved leave");
      } else if (kind === 3) {
        dayStatus = "late";
        firstInUtc = `${date}T03:35:00.000Z`;
        flags.push("Late by 25 min");
      } else if (kind === 6) {
        dayStatus = "missing_punch";
        lastOutUtc = null;
        flags.push("Missing check-out");
      } else if (kind === 8) {
        dayStatus = "absent";
        firstInUtc = null;
        lastOutUtc = null;
        flags.push("No punches recorded");
      }
      return {
        staffId: r.id,
        fullName: r.fullName,
        staffCode: r.staffCode,
        branchName: r.branchName,
        departmentName: r.departmentName,
        firstInUtc,
        lastOutUtc,
        dayStatus,
        flags,
      };
    });
    const summary = { present: 0, late: 0, absent: 0, on_leave: 0, missing_punch: 0, total: rows.length };
    rows.forEach((r) => summary[r.dayStatus]++);
    return { date, rows, summary };
  },

  async listCorrectionRequests(organizationId: string): Promise<CorrectionRequest[]> {
    await delay();
    const s = stateOf(organizationId);
    const staffById = new Map(getMockActiveStaff(organizationId).map((r) => [r.id, r]));
    return structuredClone(
      s.corrections.map((c) => {
        const rec = staffById.get(c.staffId);
        return rec ? { ...c, staffName: rec.fullName, branchName: rec.branchName } : c;
      }),
    );
  },

  async submitCorrection(
    organizationId: string,
    input: CorrectionInput,
  ): Promise<CorrectionRequest> {
    await delay();
    const s = stateOf(organizationId);
    const rec = getMockActiveStaff(organizationId).find((r) => r.id === input.staffId);
    if (!rec) fieldError("staffId", "Select a staff member.");
    if (!input.reason.trim()) fieldError("reason", "Give a short reason.");
    const req: CorrectionRequest = {
      id: `corr-new-${++s.seq}`,
      staffId: rec.id,
      staffName: rec.fullName,
      branchName: rec.branchName,
      date: input.date,
      correctedIn: input.correctedIn || null,
      correctedOut: input.correctedOut || null,
      reason: input.reason.trim(),
      status: "pending",
      requestedAtUtc: new Date().toISOString(),
    };
    s.corrections.unshift(req);
    return structuredClone(req);
  },

  async decideCorrection(
    organizationId: string,
    requestId: string,
    decision: "approved" | "rejected",
  ): Promise<CorrectionRequest[]> {
    await delay();
    const s = stateOf(organizationId);
    requireAttendanceManager(organizationId);
    const req = s.corrections.find((c) => c.id === requestId);
    if (!req) mockError(404, "REQUEST_NOT_FOUND", "Request not found.");
    req.status = decision;
    return this.listCorrectionRequests(organizationId);
  },

  async listLeaveRequests(organizationId: string): Promise<LeaveRequest[]> {
    await delay();
    const s = stateOf(organizationId);
    const staffById = new Map(getMockActiveStaff(organizationId).map((r) => [r.id, r]));
    return structuredClone(
      s.leaves.map((l) => {
        const rec = staffById.get(l.staffId);
        return rec ? { ...l, staffName: rec.fullName, branchName: rec.branchName } : l;
      }),
    );
  },

  async submitLeave(organizationId: string, input: LeaveInput): Promise<LeaveRequest> {
    await delay();
    const s = stateOf(organizationId);
    const rec = getMockActiveStaff(organizationId).find((r) => r.id === input.staffId);
    if (!rec) fieldError("staffId", "Select a staff member.");
    if (input.from > input.to) fieldError("to", "End date must be on/after the start date.");
    if (!input.reason.trim()) fieldError("reason", "Give a short reason.");
    const req: LeaveRequest = {
      id: `leave-new-${++s.seq}`,
      staffId: rec.id,
      staffName: rec.fullName,
      branchName: rec.branchName,
      from: input.from,
      to: input.to,
      reason: input.reason.trim(),
      status: "pending",
      requestedAtUtc: new Date().toISOString(),
    };
    s.leaves.unshift(req);
    return structuredClone(req);
  },

  async decideLeave(
    organizationId: string,
    requestId: string,
    decision: "approved" | "rejected",
  ): Promise<LeaveRequest[]> {
    await delay();
    const s = stateOf(organizationId);
    requireAttendanceManager(organizationId);
    const req = s.leaves.find((l) => l.id === requestId);
    if (!req) mockError(404, "REQUEST_NOT_FOUND", "Request not found.");
    req.status = decision;
    return this.listLeaveRequests(organizationId);
  },
};
