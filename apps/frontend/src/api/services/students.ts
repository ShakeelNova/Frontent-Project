import { mockStudentsApi } from "@/api/mock/mock-school";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Students service seam (Phase 5). Assumed endpoints (CR-007):
 *   GET    /organizations/{orgId}/students            (paged, filters)
 *   POST   /organizations/{orgId}/students
 *   GET    /organizations/{orgId}/students/{id}
 *   PATCH  /organizations/{orgId}/students/{id}
 *   POST   /organizations/{orgId}/students/{id}/status       {status}
 *   POST   /organizations/{orgId}/students/{id}/transfer     {toBranchId, effectiveOn}
 *   POST   /organizations/{orgId}/students/{id}/guardians    (link/create)
 *   DELETE /organizations/{orgId}/students/{id}/guardians/{guardianId} (unlink)
 *   POST   /organizations/{orgId}/students/{id}/enrollments
 *   POST   /organizations/{orgId}/students/{id}/enrollments/{enrollmentId}/end
 * Capacity and duplicate decisions are the BACKEND's — the UI only
 * surfaces `STUDENT_CAPACITY_FULL` / `ALREADY_ENROLLED` as friendly copy.
 */

export type StudentStatus = "active" | "inactive" | "alumni";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  alumni: "Alumni",
};

export interface StudentSummary {
  id: string;
  studentCode: string;
  fullName: string;
  branchId: string;
  branchName: string;
  status: StudentStatus;
  currentClassId: string | null;
  currentClassName: string | null;
  currentProgramName: string | null;
}

export interface Guardian {
  id: string;
  fullName: string;
  relationship: string;
  email: string | null;
  phone: string | null;
}

export interface Enrollment {
  id: string;
  programId: string;
  programName: string;
  classId: string;
  className: string;
  startsOn: string;
  endsOn: string | null;
  status: "active" | "ended";
}

export interface BranchHistoryEntry {
  branchId: string;
  branchName: string;
  from: string;
  to: string | null;
}

export interface StudentDetail extends StudentSummary {
  dateOfBirth: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  admissionDate: string;
  guardians: Guardian[];
  enrollments: Enrollment[];
  branchHistory: BranchHistoryEntry[];
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentListParams {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  status?: StudentStatus;
  programId?: string;
}

export interface CreateStudentInput {
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  email?: string;
  phone?: string;
  branchId: string;
  /** Optional initial enrollment. */
  programId?: string;
  classId?: string;
  enrollmentStartDate?: string;
}

export interface UpdateStudentInput {
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface LinkGuardianInput {
  fullName: string;
  relationship: string;
  email?: string;
  phone?: string;
}

export interface EnrollInput {
  programId: string;
  classId: string;
  startsOn: string;
}

export interface TransferInput {
  toBranchId: string;
  effectiveOn: string;
}

const FEATURE = "Students";

export async function listStudents(
  organizationId: string,
  params: StudentListParams,
): Promise<PagedResult<StudentSummary>> {
  if (getApiTransport() === "mock") return mockStudentsApi.listStudents(organizationId, params);
  return contractUnavailable(FEATURE);
}

export async function createStudent(
  organizationId: string,
  input: CreateStudentInput,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.createStudent(organizationId, input);
  return contractUnavailable(FEATURE);
}

export async function getStudent(
  organizationId: string,
  studentId: string,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.getStudent(organizationId, studentId);
  return contractUnavailable(FEATURE);
}

export async function updateStudent(
  organizationId: string,
  studentId: string,
  input: UpdateStudentInput,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.updateStudent(organizationId, studentId, input);
  return contractUnavailable(FEATURE);
}

export async function updateStudentStatus(
  organizationId: string,
  studentId: string,
  status: StudentStatus,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.updateStudentStatus(organizationId, studentId, status);
  return contractUnavailable(FEATURE);
}

export async function transferStudent(
  organizationId: string,
  studentId: string,
  input: TransferInput,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.transferStudent(organizationId, studentId, input);
  return contractUnavailable(FEATURE);
}

export async function linkGuardian(
  organizationId: string,
  studentId: string,
  input: LinkGuardianInput,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.linkGuardian(organizationId, studentId, input);
  return contractUnavailable(FEATURE);
}

export async function unlinkGuardian(
  organizationId: string,
  studentId: string,
  guardianId: string,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.unlinkGuardian(organizationId, studentId, guardianId);
  return contractUnavailable(FEATURE);
}

export async function enrollStudent(
  organizationId: string,
  studentId: string,
  input: EnrollInput,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.enrollStudent(organizationId, studentId, input);
  return contractUnavailable(FEATURE);
}

export async function endEnrollment(
  organizationId: string,
  studentId: string,
  enrollmentId: string,
  endsOn: string,
): Promise<StudentDetail> {
  if (getApiTransport() === "mock") return mockStudentsApi.endEnrollment(organizationId, studentId, enrollmentId, endsOn);
  return contractUnavailable(FEATURE);
}
