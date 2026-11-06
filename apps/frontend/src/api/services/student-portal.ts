import { mockStudentPortalApi } from "@/api/mock/mock-student-portal";
import { contractUnavailable, getApiTransport } from "@/api/transport";
import type { TimetableEntry } from "./academics";
import type { VoucherDetail } from "./fees";

/**
 * Student/parent portal service seam (Phase 7). Assumed endpoints (CR-009):
 *   GET /me/students                                  (linked students)
 *   GET /me/students/{studentId}/attendance
 *   GET /me/students/{studentId}/timetable
 *   GET /me/students/{studentId}/fees                 (vouchers + receipts)
 *   GET /me/students/{studentId}/notices
 *   GET /me/students/{studentId}/results
 *
 * HARD RULES: the backend resolves "linked students" from the session —
 * the client never picks arbitrary student IDs. Anything not linked is a
 * backend 403. No organization metrics, no other students, no management
 * data ever crosses this seam.
 */

export interface LinkedStudent {
  id: string;
  fullName: string;
  studentCode: string;
  className: string | null;
  programName: string | null;
  branchName: string;
  organizationId: string;
  organizationName: string;
  timezone: string;
  currency: string;
}

export type MyAttendanceStatus = "present" | "absent" | "late" | "excused";

export interface MyAttendanceDay {
  date: string;
  status: MyAttendanceStatus;
}

export interface MyAttendance {
  /** Backend-computed summary for the current term window. */
  summary: Record<MyAttendanceStatus, number> & { totalDays: number; attendancePercent: number };
  recent: MyAttendanceDay[];
}

export interface MyTimetable {
  className: string | null;
  timezone: string;
  entries: TimetableEntry[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  audienceLabel: string;
  publishedAtUtc: string;
}

export interface ResultSubject {
  subjectName: string;
  marksObtained: number;
  marksTotal: number;
  gradeLabel: string;
}

export interface MyResults {
  available: boolean;
  /** Present when the backend says results aren't published yet. */
  unavailableReason: string | null;
  terms: { label: string; subjects: ResultSubject[] }[];
}

const FEATURE = "Student portal";

export async function getMyStudents(): Promise<LinkedStudent[]> {
  if (getApiTransport() === "mock") return mockStudentPortalApi.getMyStudents();
  return contractUnavailable(FEATURE);
}
export async function getMyStudentAttendance(studentId: string): Promise<MyAttendance> {
  if (getApiTransport() === "mock")
    return mockStudentPortalApi.getMyStudentAttendance(studentId);
  return contractUnavailable(FEATURE);
}
export async function getMyStudentTimetable(studentId: string): Promise<MyTimetable> {
  if (getApiTransport() === "mock")
    return mockStudentPortalApi.getMyStudentTimetable(studentId);
  return contractUnavailable(FEATURE);
}
export async function getMyStudentFees(studentId: string): Promise<VoucherDetail[]> {
  if (getApiTransport() === "mock") return mockStudentPortalApi.getMyStudentFees(studentId);
  return contractUnavailable(FEATURE);
}
export async function getMyNotices(studentId: string): Promise<Notice[]> {
  if (getApiTransport() === "mock") return mockStudentPortalApi.getMyNotices(studentId);
  return contractUnavailable(FEATURE);
}
export async function getMyStudentResults(studentId: string): Promise<MyResults> {
  if (getApiTransport() === "mock")
    return mockStudentPortalApi.getMyStudentResults(studentId);
  return contractUnavailable(FEATURE);
}
