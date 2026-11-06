/**
 * DEV/TEST-ONLY student/parent portal fixtures (Phase 7). Enabled only
 * via NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints: CR-009.
 *
 * Backend-mirroring rules:
 * - Linked students are resolved from the SESSION (guardian account),
 *   never from client input. Demo guardian (mock-user-guardian) is
 *   linked to two Sunrise students.
 * - Every per-student read re-checks the link; anything else → 403
 *   LINKED_STUDENT_FORBIDDEN. Staff sessions get 403 here too (these
 *   endpoints belong to linked users), and signed-out → 401.
 * - Attendance summaries/results are computed in this mock as the
 *   backend would; the UI renders them verbatim.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { getMockStudentVouchers } from "@/api/mock/mock-fees";
import { getMockMembership } from "@/api/mock/mock-portal";
import {
  getMockClassTimetable,
  getMockStudentPortalInfo,
} from "@/api/mock/mock-school";
import type {
  LinkedStudent,
  MyAttendance,
  MyAttendanceStatus,
  MyResults,
  MyTimetable,
  Notice,
} from "@/api/services/student-portal";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

/** Session → linked (organizationId, studentId) pairs. Backend-owned. */
const LINKS: Record<string, { organizationId: string; studentId: string }[]> = {
  "mock-user-guardian": [
    { organizationId: "org-sunrise", studentId: "stu-sun-1" },
    { organizationId: "org-sunrise", studentId: "stu-sun-2" },
  ],
};

const ORG_NAMES: Record<string, string> = {
  "org-sunrise": "Sunrise Academy",
  "org-northgate": "Northgate College",
  "org-riverdale": "Riverdale Coaching",
  "org-fresh": "Fresh Start Institute",
};

function requireLinkedUser() {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  if (user!.kind === "staff") {
    mockError(403, "FORBIDDEN", "The student/parent area is for linked students and guardians.");
  }
  return user!;
}

function requireLink(studentId: string): { organizationId: string; studentId: string } {
  const user = requireLinkedUser();
  const link = (LINKS[user.id] ?? []).find((l) => l.studentId === studentId);
  if (!link) {
    mockError(403, "LINKED_STUDENT_FORBIDDEN", "That student isn't linked to your account.");
  }
  return link!;
}

function linkedStudent(link: { organizationId: string; studentId: string }): LinkedStudent {
  const info = getMockStudentPortalInfo(link.organizationId, link.studentId);
  const membership = getMockMembership(link.organizationId);
  return {
    id: link.studentId,
    fullName: info?.fullName ?? "Student",
    studentCode: info?.studentCode ?? "",
    className: info?.className ?? null,
    programName: info?.programName ?? null,
    branchName: info?.branchName ?? "",
    organizationId: link.organizationId,
    organizationName: ORG_NAMES[link.organizationId] ?? link.organizationId,
    timezone: membership.timezone,
    currency: membership.currency,
  };
}

function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 9973;
  return h;
}

const NOTICES: Notice[] = [
  {
    id: "notice-1",
    title: "Winter uniform reminder",
    body: "Blazers are required from 1 November. The uniform shop is open on Saturdays (mock notice).",
    audienceLabel: "All students",
    publishedAtUtc: "2026-10-20T04:00:00.000Z",
  },
  {
    id: "notice-2",
    title: "Parent–teacher meeting",
    body: "PTM for Grade 9–10 is on Saturday 31 October, 9:00 am–12:00 pm at Main campus (mock notice).",
    audienceLabel: "Grade 9–10 guardians",
    publishedAtUtc: "2026-10-22T04:00:00.000Z",
  },
];

export const mockStudentPortalApi = {
  async getMyStudents(): Promise<LinkedStudent[]> {
    await delay(100);
    const user = requireLinkedUser();
    return (LINKS[user.id] ?? []).map(linkedStudent);
  },

  async getMyStudentAttendance(studentId: string): Promise<MyAttendance> {
    await delay(100);
    requireLink(studentId);
    // Last 10 school days (skipping Sundays), deterministic per student.
    const recent: { date: string; status: MyAttendanceStatus }[] = [];
    const cursor = new Date();
    while (recent.length < 10) {
      cursor.setDate(cursor.getDate() - 1);
      if (cursor.getDay() === 0) continue;
      const date = cursor.toISOString().slice(0, 10);
      const bucket = hashOf(`${studentId}|${date}`) % 20;
      const status: MyAttendanceStatus =
        bucket === 0 ? "absent" : bucket === 1 ? "late" : bucket === 2 ? "excused" : "present";
      recent.push({ date, status });
    }
    const summary = { present: 0, absent: 0, late: 0, excused: 0, totalDays: 40, attendancePercent: 0 };
    // Term-to-date window (40 school days) computed the same way.
    const c2 = new Date();
    let counted = 0;
    while (counted < 40) {
      c2.setDate(c2.getDate() - 1);
      if (c2.getDay() === 0) continue;
      const date = c2.toISOString().slice(0, 10);
      const bucket = hashOf(`${studentId}|${date}`) % 20;
      if (bucket === 0) summary.absent++;
      else if (bucket === 1) summary.late++;
      else if (bucket === 2) summary.excused++;
      else summary.present++;
      counted++;
    }
    summary.attendancePercent = Math.round(
      ((summary.present + summary.late) / summary.totalDays) * 100,
    );
    return { summary, recent };
  },

  async getMyStudentTimetable(studentId: string): Promise<MyTimetable> {
    await delay(100);
    const link = requireLink(studentId);
    const info = getMockStudentPortalInfo(link.organizationId, studentId);
    const membership = getMockMembership(link.organizationId);
    return {
      className: info?.className ?? null,
      timezone: membership.timezone,
      entries: info?.classId
        ? getMockClassTimetable(link.organizationId, info.classId)
        : [],
    };
  },

  async getMyStudentFees(studentId: string) {
    await delay(100);
    const link = requireLink(studentId);
    return getMockStudentVouchers(link.organizationId, studentId);
  },

  async getMyNotices(studentId: string): Promise<Notice[]> {
    await delay(100);
    requireLink(studentId);
    return structuredClone(NOTICES);
  },

  async getMyStudentResults(studentId: string): Promise<MyResults> {
    await delay(100);
    requireLink(studentId);
    // Demo: one published term for the first linked student; the second
    // student's results aren't published yet (honest unavailable state).
    if (studentId !== "stu-sun-1") {
      return {
        available: false,
        unavailableReason: "Results for the current term haven't been published yet.",
        terms: [],
      };
    }
    const subjects = ["Mathematics", "English", "Physics", "Chemistry", "Biology"].map(
      (name, i) => {
        const marksObtained = 62 + ((hashOf(`${studentId}|${name}`) + i * 7) % 34);
        return {
          subjectName: name,
          marksObtained,
          marksTotal: 100,
          gradeLabel: marksObtained >= 85 ? "A" : marksObtained >= 70 ? "B" : "C",
        };
      },
    );
    return { available: true, unavailableReason: null, terms: [{ label: "Mid-term · Oct 2026", subjects }] };
  },
};
