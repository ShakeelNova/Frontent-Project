import { mockAcademicsApi } from "@/api/mock/mock-school";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Academic structure service seam (Phase 5). Assumed endpoints (CR-007):
 *   GET/POST          /organizations/{orgId}/academic-years
 *   PATCH/DELETE      /organizations/{orgId}/academic-years/{id}
 *   GET/POST          /organizations/{orgId}/programs
 *   PATCH/DELETE      /organizations/{orgId}/programs/{id}
 *   GET/POST          /organizations/{orgId}/classes
 *   PATCH/DELETE      /organizations/{orgId}/classes/{id}
 *   GET/POST          /organizations/{orgId}/subjects
 *   PATCH/DELETE      /organizations/{orgId}/subjects/{id}
 *   GET/POST/DELETE   /organizations/{orgId}/classes/{id}/subjects
 *   GET/POST/DELETE   /organizations/{orgId}/classes/{id}/timetable
 * `isCurrent` on academic years is backend-computed — never derived here.
 * Timetable entry times are UTC wall-clock ("HH:mm"); UI converts to the
 * org timezone for display (see src/lib/datetime.ts).
 */

export interface AcademicYear {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  /** Backend-decided. */
  isCurrent: boolean;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface ClassGroup {
  id: string;
  name: string;
  programId: string;
  programName: string;
  academicYearId: string;
  academicYearLabel: string;
  branchId: string;
  branchName: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  /** 1 = Monday … 6 = Saturday (weekly recurring). */
  weekday: number;
  startsAtUtc: string;
  endsAtUtc: string;
  subjectId: string;
  subjectName: string;
}

export interface AcademicYearInput {
  label: string;
  startsOn: string;
  endsOn: string;
}

export interface ProgramInput {
  name: string;
  code: string;
  description?: string;
}

export interface ClassInput {
  name: string;
  programId: string;
  academicYearId: string;
  branchId: string;
}

export interface SubjectInput {
  name: string;
  code: string;
}

export interface TimetableEntryInput {
  weekday: number;
  startsAtUtc: string;
  endsAtUtc: string;
  subjectId: string;
}

const FEATURE = "Academic structure";

export async function listAcademicYears(organizationId: string): Promise<AcademicYear[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.listAcademicYears(organizationId);
  return contractUnavailable(FEATURE);
}
export async function createAcademicYear(organizationId: string, input: AcademicYearInput): Promise<AcademicYear> {
  if (getApiTransport() === "mock") return mockAcademicsApi.createAcademicYear(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateAcademicYear(organizationId: string, id: string, input: AcademicYearInput): Promise<AcademicYear> {
  if (getApiTransport() === "mock") return mockAcademicsApi.updateAcademicYear(organizationId, id, input);
  return contractUnavailable(FEATURE);
}
export async function deleteAcademicYear(organizationId: string, id: string): Promise<void> {
  if (getApiTransport() === "mock") return mockAcademicsApi.deleteAcademicYear(organizationId, id);
  return contractUnavailable(FEATURE);
}

export async function listPrograms(organizationId: string): Promise<Program[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.listPrograms(organizationId);
  return contractUnavailable(FEATURE);
}
export async function createProgram(organizationId: string, input: ProgramInput): Promise<Program> {
  if (getApiTransport() === "mock") return mockAcademicsApi.createProgram(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateProgram(organizationId: string, id: string, input: ProgramInput): Promise<Program> {
  if (getApiTransport() === "mock") return mockAcademicsApi.updateProgram(organizationId, id, input);
  return contractUnavailable(FEATURE);
}
export async function deleteProgram(organizationId: string, id: string): Promise<void> {
  if (getApiTransport() === "mock") return mockAcademicsApi.deleteProgram(organizationId, id);
  return contractUnavailable(FEATURE);
}

export async function listClasses(organizationId: string): Promise<ClassGroup[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.listClasses(organizationId);
  return contractUnavailable(FEATURE);
}
export async function createClass(organizationId: string, input: ClassInput): Promise<ClassGroup> {
  if (getApiTransport() === "mock") return mockAcademicsApi.createClass(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateClass(organizationId: string, id: string, input: ClassInput): Promise<ClassGroup> {
  if (getApiTransport() === "mock") return mockAcademicsApi.updateClass(organizationId, id, input);
  return contractUnavailable(FEATURE);
}
export async function deleteClass(organizationId: string, id: string): Promise<void> {
  if (getApiTransport() === "mock") return mockAcademicsApi.deleteClass(organizationId, id);
  return contractUnavailable(FEATURE);
}

export async function listSubjects(organizationId: string): Promise<Subject[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.listSubjects(organizationId);
  return contractUnavailable(FEATURE);
}
export async function createSubject(organizationId: string, input: SubjectInput): Promise<Subject> {
  if (getApiTransport() === "mock") return mockAcademicsApi.createSubject(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateSubject(organizationId: string, id: string, input: SubjectInput): Promise<Subject> {
  if (getApiTransport() === "mock") return mockAcademicsApi.updateSubject(organizationId, id, input);
  return contractUnavailable(FEATURE);
}
export async function deleteSubject(organizationId: string, id: string): Promise<void> {
  if (getApiTransport() === "mock") return mockAcademicsApi.deleteSubject(organizationId, id);
  return contractUnavailable(FEATURE);
}

export async function listClassSubjects(organizationId: string, classId: string): Promise<Subject[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.listClassSubjects(organizationId, classId);
  return contractUnavailable(FEATURE);
}
export async function assignSubjectToClass(organizationId: string, classId: string, subjectId: string): Promise<Subject[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.assignSubjectToClass(organizationId, classId, subjectId);
  return contractUnavailable(FEATURE);
}
export async function unassignSubjectFromClass(organizationId: string, classId: string, subjectId: string): Promise<Subject[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.unassignSubjectFromClass(organizationId, classId, subjectId);
  return contractUnavailable(FEATURE);
}

export async function getTimetable(organizationId: string, classId: string): Promise<TimetableEntry[]> {
  if (getApiTransport() === "mock") return mockAcademicsApi.getTimetable(organizationId, classId);
  return contractUnavailable(FEATURE);
}
export async function addTimetableEntry(organizationId: string, classId: string, input: TimetableEntryInput): Promise<TimetableEntry> {
  if (getApiTransport() === "mock") return mockAcademicsApi.addTimetableEntry(organizationId, classId, input);
  return contractUnavailable(FEATURE);
}
export async function deleteTimetableEntry(organizationId: string, classId: string, entryId: string): Promise<void> {
  if (getApiTransport() === "mock") return mockAcademicsApi.deleteTimetableEntry(organizationId, classId, entryId);
  return contractUnavailable(FEATURE);
}
