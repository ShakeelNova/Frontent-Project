import { mockAttendanceApi } from "@/api/mock/mock-attendance";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Attendance service seam (Phase 6). Assumed endpoints (CR-008):
 *   GET  /organizations/{orgId}/attendance/students?date&classId
 *   POST /organizations/{orgId}/attendance/students/mark        (batch)
 *   POST /organizations/{orgId}/attendance/qr-sessions          {classId,date}
 *   GET  /organizations/{orgId}/attendance/qr-sessions/{id}     (poll)
 *   POST /organizations/{orgId}/attendance/qr-sessions/{id}/check-in {token}
 *   GET  /organizations/{orgId}/attendance/staff?date&branchId&departmentId
 *   GET/POST /organizations/{orgId}/attendance/correction-requests
 *   POST /organizations/{orgId}/attendance/correction-requests/{id}/approve|reject
 *   GET/POST /organizations/{orgId}/attendance/leave-requests (+ approve|reject)
 *
 * HARD RULES: statuses (late/missing/etc.) and summaries are computed by
 * the BACKEND — the UI renders them verbatim and never derives heuristics.
 * Times are UTC instants from the API, displayed in the org timezone.
 * Mutations ride the central client (credentials + CSRF token seam).
 */

export type StudentAttendanceStatus = "present" | "absent" | "late" | "excused";

export const STUDENT_ATTENDANCE_LABELS: Record<StudentAttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export interface StudentAttendanceRow {
  studentId: string;
  fullName: string;
  studentCode: string;
  /** null = not marked yet. */
  status: StudentAttendanceStatus | null;
  markedVia: "manual" | "qr" | "device" | null;
  checkedInAtUtc: string | null;
}

export interface StudentAttendanceDay {
  date: string;
  classId: string;
  className: string;
  branchName: string;
  rows: StudentAttendanceRow[];
  /** Backend-computed counts. */
  summary: Record<StudentAttendanceStatus, number> & { unmarked: number; total: number };
}

export interface StudentMark {
  studentId: string;
  status: StudentAttendanceStatus;
}

export interface QrCheckIn {
  studentId: string;
  fullName: string;
  studentCode: string;
  checkedInAtUtc: string;
}

export interface QrSession {
  id: string;
  /** Short joining code students use (also encoded in the QR by the backend). */
  code: string;
  date: string;
  classId: string;
  className: string;
  expiresAtUtc: string;
  checkIns: QrCheckIn[];
  rosterTotal: number;
}

/** Backend-flagged day status for a staff member (never derived here). */
export type StaffDayStatus = "present" | "late" | "absent" | "on_leave" | "missing_punch";

export const STAFF_DAY_STATUS_LABELS: Record<StaffDayStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "On leave",
  missing_punch: "Missing punch",
};

export interface StaffAttendanceRow {
  staffId: string;
  fullName: string;
  staffCode: string;
  branchName: string;
  departmentName: string | null;
  firstInUtc: string | null;
  lastOutUtc: string | null;
  dayStatus: StaffDayStatus;
  /** Free-form backend flags, rendered verbatim (e.g. "Late by 25 min"). */
  flags: string[];
}

export interface StaffAttendanceDay {
  date: string;
  rows: StaffAttendanceRow[];
  summary: Record<StaffDayStatus, number> & { total: number };
}

export type RequestStatus = "pending" | "approved" | "rejected";

export interface CorrectionRequest {
  id: string;
  staffId: string;
  staffName: string;
  branchName: string;
  date: string;
  correctedIn: string | null;
  correctedOut: string | null;
  reason: string;
  status: RequestStatus;
  requestedAtUtc: string;
}

export interface CorrectionInput {
  staffId: string;
  date: string;
  correctedIn?: string;
  correctedOut?: string;
  reason: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  branchName: string;
  from: string;
  to: string;
  reason: string;
  status: RequestStatus;
  requestedAtUtc: string;
}

export interface LeaveInput {
  staffId: string;
  from: string;
  to: string;
  reason: string;
}

const FEATURE = "Attendance";

export async function getStudentAttendance(
  organizationId: string,
  date: string,
  classId: string,
): Promise<StudentAttendanceDay> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.getStudentAttendance(organizationId, date, classId);
  return contractUnavailable(FEATURE);
}
export async function markStudentAttendance(
  organizationId: string,
  date: string,
  classId: string,
  marks: StudentMark[],
): Promise<StudentAttendanceDay> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.markStudentAttendance(organizationId, date, classId, marks);
  return contractUnavailable(FEATURE);
}
export async function startQrSession(
  organizationId: string,
  classId: string,
  date: string,
): Promise<QrSession> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.startQrSession(organizationId, classId, date);
  return contractUnavailable(FEATURE);
}
export async function getQrSession(organizationId: string, sessionId: string): Promise<QrSession> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.getQrSession(organizationId, sessionId);
  return contractUnavailable(FEATURE);
}
export async function qrCheckIn(
  organizationId: string,
  sessionId: string,
  token: string,
): Promise<QrSession> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.qrCheckIn(organizationId, sessionId, token);
  return contractUnavailable(FEATURE);
}
export async function getStaffAttendance(
  organizationId: string,
  date: string,
  branchId?: string,
  departmentId?: string,
): Promise<StaffAttendanceDay> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.getStaffAttendance(organizationId, date, branchId, departmentId);
  return contractUnavailable(FEATURE);
}
export async function listCorrectionRequests(
  organizationId: string,
): Promise<CorrectionRequest[]> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.listCorrectionRequests(organizationId);
  return contractUnavailable(FEATURE);
}
export async function submitCorrection(
  organizationId: string,
  input: CorrectionInput,
): Promise<CorrectionRequest> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.submitCorrection(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function decideCorrection(
  organizationId: string,
  requestId: string,
  decision: "approved" | "rejected",
): Promise<CorrectionRequest[]> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.decideCorrection(organizationId, requestId, decision);
  return contractUnavailable(FEATURE);
}
export async function listLeaveRequests(organizationId: string): Promise<LeaveRequest[]> {
  if (getApiTransport() === "mock") return mockAttendanceApi.listLeaveRequests(organizationId);
  return contractUnavailable(FEATURE);
}
export async function submitLeave(
  organizationId: string,
  input: LeaveInput,
): Promise<LeaveRequest> {
  if (getApiTransport() === "mock") return mockAttendanceApi.submitLeave(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function decideLeave(
  organizationId: string,
  requestId: string,
  decision: "approved" | "rejected",
): Promise<LeaveRequest[]> {
  if (getApiTransport() === "mock")
    return mockAttendanceApi.decideLeave(organizationId, requestId, decision);
  return contractUnavailable(FEATURE);
}
