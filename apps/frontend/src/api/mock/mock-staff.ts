/**
 * DEV/TEST-ONLY staff fixtures (Phase 6) — directory, invitations,
 * approvals, activation, role/branch assignment. Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints: CR-008.
 *
 * Backend-mirroring rules:
 * - Membership/visibility from mock-portal; branch managers only see
 *   staff assigned to their authorized branches.
 * - Role changes are Owner/GM-only → others get ROLE_CHANGE_FORBIDDEN.
 * - The last owner can't lose the owner role (409 LAST_OWNER) and you
 *   can't deactivate your own account.
 * - Duplicate invite email → INVITE_ALREADY_EXISTS (409).
 * - Invite lifecycle matches Phase 3: invited → (accepts) →
 *   pending approval → approve/reject.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { getMockMembership } from "@/api/mock/mock-portal";
import {
  mockBranchNameOf,
  mockRequireVisibleBranch,
  mockVisibleBranchIds,
} from "@/api/mock/mock-school";
import type { PagedResult } from "@/api/services/students";
import type {
  CatalogItem,
  InviteStaffInput,
  StaffDetail,
  StaffListParams,
  StaffRole,
  StaffSummary,
  UpdateStaffInput,
} from "@/api/services/staff";

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

const ROLES: StaffRole[] = [
  { key: "owner", label: "Owner" },
  { key: "general_manager", label: "General Manager" },
  { key: "branch_manager", label: "Branch Manager" },
  { key: "teacher", label: "Teacher" },
  { key: "accountant", label: "Accountant" },
  { key: "front_desk", label: "Front Desk" },
];

const FIRST = [
  "Sana", "Usman", "Iqra", "Adnan", "Nida", "Faisal", "Komal", "Shahid",
  "Rukhsana", "Waqar", "Sehrish", "Naveed", "Farah", "Junaid", "Mehwish",
];
const LAST = [
  "Akhtar", "Qureshi", "Hashmi", "Rizvi", "Ansari", "Butt", "Chohan",
  "Dar", "Gill", "Hayat", "Jatoi", "Leghari",
];

interface StaffRecord extends Omit<StaffDetail, "roles" | "isSelf" | "branchNames"> {
  roleKeys: string[];
}

interface OrgStaffState {
  departments: CatalogItem[];
  designations: CatalogItem[];
  staff: StaffRecord[];
  seq: number;
}

function makeCatalog(prefix: string) {
  return {
    departments: [
      { id: `${prefix}-dept-acad`, name: "Academics" },
      { id: `${prefix}-dept-admin`, name: "Administration" },
      { id: `${prefix}-dept-fin`, name: "Finance" },
      { id: `${prefix}-dept-ops`, name: "Operations" },
    ],
    designations: [
      { id: `${prefix}-des-principal`, name: "Principal" },
      { id: `${prefix}-des-vp`, name: "Vice Principal" },
      { id: `${prefix}-des-sr-teacher`, name: "Senior Teacher" },
      { id: `${prefix}-des-teacher`, name: "Teacher" },
      { id: `${prefix}-des-coord`, name: "Coordinator" },
      { id: `${prefix}-des-acct`, name: "Accountant" },
      { id: `${prefix}-des-front`, name: "Receptionist" },
    ],
  };
}

function summaryFor(orgId: string, n: number): StaffDetail["attendanceSummary"] {
  const present = 20 + (n % 7);
  const late = n % 4;
  const leave = n % 3;
  const absent = Math.max(0, 30 - present - late - leave);
  return {
    periodDays: 30,
    presentDays: present,
    lateDays: late,
    absentDays: absent,
    leaveDays: leave,
    attendancePercent: Math.round(((present + late) / 30) * 100),
  };
}

function makeOrgStaff(
  orgId: string,
  prefix: string,
  selfRoleKey: string,
  count: number,
  branchPlan: { branchId: string; branchName: string; count: number }[],
): OrgStaffState {
  const { departments, designations } = makeCatalog(prefix);
  const staff: StaffRecord[] = [];
  const selfBranch = branchPlan[0]!;
  staff.push({
    id: `staff-${prefix}-self`,
    staffCode: `${prefix.toUpperCase()}-STF-001`,
    fullName: "Demo Owner",
    email: "owner@demo.fluxeaze.test",
    phone: "+92 300 1111111",
    primaryBranchId: selfBranch.branchId,
    primaryBranchName: selfBranch.branchName,
    departmentId: departments[1]!.id,
    departmentName: departments[1]!.name,
    designationId: designations[0]!.id,
    designationName: designations[0]!.name,
    roleKeys: [selfRoleKey],
    status: "active",
    approvalState: "approved",
    branchIds: branchPlan.map((b) => b.branchId),
    invitedAt: null,
    joinedOn: "2025-06-01",
    attendanceSummary: summaryFor(orgId, 3),
  });

  let n = 1;
  branchPlan.forEach((plan, planIdx) => {
    for (let i = 0; i < plan.count && staff.length < count; i++) {
      n++;
      const dept = departments[n % departments.length]!;
      const des = designations[2 + (n % 5)]!;
      const first = FIRST[(n * 3 + planIdx) % FIRST.length]!;
      const last = LAST[(n * 4 + planIdx) % LAST.length]!;
      staff.push({
        id: `staff-${prefix}-${n}`,
        staffCode: `${prefix.toUpperCase()}-STF-${String(n).padStart(3, "0")}`,
        fullName: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${prefix}.test`,
        phone: `+92 3${20 + (n % 40)} 0000${String(n).padStart(3, "0")}`,
        primaryBranchId: plan.branchId,
        primaryBranchName: plan.branchName,
        departmentId: dept.id,
        departmentName: dept.name,
        designationId: des.id,
        designationName: des.name,
        roleKeys: [des.id.includes("acct") ? "accountant" : des.id.includes("front") ? "front_desk" : "teacher"],
        status: n % 9 === 0 ? "inactive" : "active",
        approvalState: "approved",
        branchIds: [plan.branchId],
        invitedAt: null,
        joinedOn: "2026-02-01",
        attendanceSummary: summaryFor(orgId, n),
      });
    }
  });

  if (orgId === "org-sunrise") {
    // Invited (not yet accepted) + accepted-but-awaiting-approval anchors.
    staff.push({
      id: "staff-sun-invited",
      staffCode: "SUN-STF-090",
      fullName: ["Hadia", "Noor"].join(" "),
      email: ["hadia.noor", "@", "inbox.test"].join(""),
      phone: null,
      primaryBranchId: "br-sunrise-main",
      primaryBranchName: "Main campus",
      departmentId: departments[0]!.id,
      departmentName: departments[0]!.name,
      designationId: designations[3]!.id,
      designationName: designations[3]!.name,
      roleKeys: ["teacher"],
      status: "invited",
      approvalState: "none",
      branchIds: ["br-sunrise-main"],
      invitedAt: "2026-10-20T09:00:00.000Z",
      joinedOn: null,
      attendanceSummary: summaryFor(orgId, 0),
    });
    staff.push({
      id: "staff-sun-pending",
      staffCode: "SUN-STF-091",
      fullName: ["Talha", "Rind"].join(" "),
      email: ["talha.rind", "@", "inbox.test"].join(""),
      phone: "+92 345 0000091",
      primaryBranchId: "br-sunrise-north",
      primaryBranchName: "North campus",
      departmentId: departments[0]!.id,
      departmentName: departments[0]!.name,
      designationId: designations[3]!.id,
      designationName: designations[3]!.name,
      roleKeys: ["teacher"],
      status: "invited",
      approvalState: "pending",
      branchIds: ["br-sunrise-north"],
      invitedAt: "2026-10-18T09:00:00.000Z",
      joinedOn: null,
      attendanceSummary: summaryFor(orgId, 0),
    });
  }
  return { departments, designations, staff, seq: 200 };
}

function makeStaff(): Record<string, OrgStaffState> {
  return {
    "org-sunrise": makeOrgStaff("org-sunrise", "sun", "owner", 14, [
      { branchId: "br-sunrise-main", branchName: "Main campus", count: 9 },
      { branchId: "br-sunrise-north", branchName: "North campus", count: 4 },
    ]),
    "org-northgate": makeOrgStaff("org-northgate", "nor", "general_manager", 10, [
      { branchId: "br-northgate-city", branchName: "City branch", count: 5 },
      { branchId: "br-northgate-west", branchName: "West branch", count: 2 },
      { branchId: "br-northgate-east", branchName: "East branch", count: 2 },
    ]),
    "org-riverdale": makeOrgStaff("org-riverdale", "riv", "branch_manager", 7, [
      { branchId: "br-riverdale-gulberg", branchName: "Gulberg branch", count: 4 },
      { branchId: "br-riverdale-clifton", branchName: "Clifton branch", count: 2 },
    ]),
    "org-fresh": { ...makeCatalog("fre"), staff: [], seq: 200 },
  };
}

let state = makeStaff();

export function __resetMockStaff(): void {
  state = makeStaff();
}

function stateOf(orgId: string): OrgStaffState {
  getMockMembership(orgId);
  const s = state[orgId];
  if (!s) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return s;
}

function isSelfRecord(record: StaffRecord): boolean {
  const user = getMockSessionUser();
  return Boolean(user && record.email === user.email);
}

function toSummary(record: StaffRecord): StaffSummary {
  return {
    id: record.id,
    staffCode: record.staffCode,
    fullName: record.fullName,
    email: record.email,
    primaryBranchId: record.primaryBranchId,
    primaryBranchName: record.primaryBranchName,
    departmentName: record.departmentName,
    designationName: record.designationName,
    roles: ROLES.filter((r) => record.roleKeys.includes(r.key)),
    status: record.status,
    approvalState: record.approvalState,
  };
}

function toDetail(orgId: string, record: StaffRecord): StaffDetail {
  return {
    ...toSummary(record),
    phone: record.phone,
    departmentId: record.departmentId,
    designationId: record.designationId,
    branchIds: [...record.branchIds],
    branchNames: record.branchIds.map((id) => mockBranchNameOf(orgId, id)),
    invitedAt: record.invitedAt,
    joinedOn: record.joinedOn,
    isSelf: isSelfRecord(record),
    attendanceSummary: record.attendanceSummary,
  };
}

function visibleStaff(orgId: string, s: OrgStaffState): StaffRecord[] {
  const visible = mockVisibleBranchIds(orgId);
  return s.staff.filter((r) => r.branchIds.some((b) => visible.has(b)));
}

function findVisibleStaff(orgId: string, staffId: string, s: OrgStaffState): StaffRecord {
  const record = s.staff.find((r) => r.id === staffId);
  if (!record) mockError(404, "STAFF_NOT_FOUND", "Staff member not found.");
  const visible = mockVisibleBranchIds(orgId);
  if (!record.branchIds.some((b) => visible.has(b))) {
    mockError(403, "BRANCH_FORBIDDEN", "Not authorized for this staff member's branch.");
  }
  return record;
}

/** Owner/GM anywhere visible; BM only within visible branches. */
function requireStaffManager(orgId: string): void {
  const m = getMockMembership(orgId);
  if (!["owner", "general_manager", "branch_manager"].includes(m.role)) {
    mockError(403, "FORBIDDEN", "Your role can't manage staff.");
  }
}

function requireRoleManager(orgId: string): void {
  const m = getMockMembership(orgId);
  if (!["owner", "general_manager"].includes(m.role)) {
    mockError(403, "ROLE_CHANGE_FORBIDDEN", "You are not allowed to change this user's role.");
  }
}

export const mockStaffApi = {
  async listStaff(
    organizationId: string,
    params: StaffListParams,
  ): Promise<PagedResult<StaffSummary>> {
    await delay();
    const s = stateOf(organizationId);
    if (params.branchId) mockRequireVisibleBranch(organizationId, params.branchId);
    let rows = visibleStaff(organizationId, s);
    if (params.branchId) rows = rows.filter((r) => r.branchIds.includes(params.branchId!));
    if (params.departmentId) rows = rows.filter((r) => r.departmentId === params.departmentId);
    if (params.designationId) rows = rows.filter((r) => r.designationId === params.designationId);
    if (params.status) rows = rows.filter((r) => r.status === params.status);
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.staffCode.toLowerCase().includes(q),
      );
    }
    rows = [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName));
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize).map(toSummary),
      total: rows.length,
      page,
      pageSize,
    };
  },

  async getStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    return toDetail(organizationId, findVisibleStaff(organizationId, staffId, s));
  },

  async updateStaff(
    organizationId: string,
    staffId: string,
    input: UpdateStaffInput,
  ): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (!input.fullName.trim()) fieldError("fullName", "Full name is required.");
    record.fullName = input.fullName.trim();
    record.phone = input.phone || null;
    if (input.departmentId) {
      const dept = s.departments.find((d) => d.id === input.departmentId);
      if (dept) {
        record.departmentId = dept.id;
        record.departmentName = dept.name;
      }
    }
    if (input.designationId) {
      const des = s.designations.find((d) => d.id === input.designationId);
      if (des) {
        record.designationId = des.id;
        record.designationName = des.name;
      }
    }
    return toDetail(organizationId, record);
  },

  async inviteStaff(organizationId: string, input: InviteStaffInput): Promise<StaffSummary> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    mockRequireVisibleBranch(organizationId, input.branchId);
    const m = getMockMembership(organizationId);
    if (
      m.role === "branch_manager" &&
      ["owner", "general_manager"].includes(input.roleKey)
    ) {
      mockError(403, "ROLE_CHANGE_FORBIDDEN", "Branch managers can't invite owners or GMs.");
    }
    if (!ROLES.some((r) => r.key === input.roleKey)) {
      fieldError("roleKey", "Select a valid role.");
    }
    const email = input.email.trim().toLowerCase();
    if (s.staff.some((r) => r.email.toLowerCase() === email)) {
      mockError(409, "INVITE_ALREADY_EXISTS", "This email is already invited or on staff.");
    }
    const dept = s.departments.find((d) => d.id === input.departmentId);
    const des = s.designations.find((d) => d.id === input.designationId);
    const n = ++s.seq;
    const prefix = organizationId.split("-")[1]?.slice(0, 3) ?? "org";
    const record: StaffRecord = {
      id: `staff-new-${n}`,
      staffCode: `${prefix.toUpperCase()}-STF-${n}`,
      fullName: input.fullName.trim(),
      email,
      phone: null,
      primaryBranchId: input.branchId,
      primaryBranchName: mockBranchNameOf(organizationId, input.branchId),
      departmentId: dept?.id ?? null,
      departmentName: dept?.name ?? null,
      designationId: des?.id ?? null,
      designationName: des?.name ?? null,
      roleKeys: [input.roleKey],
      status: "invited",
      approvalState: "none",
      branchIds: [input.branchId],
      invitedAt: new Date().toISOString(),
      joinedOn: null,
      attendanceSummary: summaryFor(organizationId, 0),
    };
    s.staff.push(record);
    return toSummary(record);
  },

  async approveStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    record.approvalState = "approved";
    record.status = "active";
    record.joinedOn = new Date().toISOString().slice(0, 10);
    return toDetail(organizationId, record);
  },

  async rejectStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    record.approvalState = "rejected";
    record.status = "inactive";
    return toDetail(organizationId, record);
  },

  async activateStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    record.status = "active";
    if (record.approvalState === "rejected") record.approvalState = "approved";
    return toDetail(organizationId, record);
  },

  async deactivateStaff(organizationId: string, staffId: string): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (isSelfRecord(record)) {
      mockError(403, "SELF_ACTION_FORBIDDEN", "You can't deactivate your own account.");
    }
    record.status = "inactive";
    return toDetail(organizationId, record);
  },

  async listRoles(organizationId: string): Promise<StaffRole[]> {
    await delay(80);
    stateOf(organizationId);
    return structuredClone(ROLES);
  },

  async assignRole(
    organizationId: string,
    staffId: string,
    roleKey: string,
  ): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireRoleManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (!ROLES.some((r) => r.key === roleKey)) fieldError("roleKey", "Unknown role.");
    if (!record.roleKeys.includes(roleKey)) record.roleKeys.push(roleKey);
    return toDetail(organizationId, record);
  },

  async removeRole(
    organizationId: string,
    staffId: string,
    roleKey: string,
  ): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireRoleManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (roleKey === "owner") {
      const owners = s.staff.filter(
        (r) => r.roleKeys.includes("owner") && r.status !== "inactive",
      );
      if (owners.length <= 1 && record.roleKeys.includes("owner")) {
        mockError(409, "LAST_OWNER", "An organization must keep at least one owner.");
      }
    }
    record.roleKeys = record.roleKeys.filter((k) => k !== roleKey);
    return toDetail(organizationId, record);
  },

  async assignBranch(
    organizationId: string,
    staffId: string,
    branchId: string,
  ): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    mockRequireVisibleBranch(organizationId, branchId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (!record.branchIds.includes(branchId)) record.branchIds.push(branchId);
    return toDetail(organizationId, record);
  },

  async removeBranch(
    organizationId: string,
    staffId: string,
    branchId: string,
  ): Promise<StaffDetail> {
    await delay();
    const s = stateOf(organizationId);
    requireStaffManager(organizationId);
    const record = findVisibleStaff(organizationId, staffId, s);
    if (record.branchIds.length <= 1) {
      fieldError("branchId", "A staff member needs at least one branch.");
    }
    record.branchIds = record.branchIds.filter((b) => b !== branchId);
    if (!record.branchIds.includes(record.primaryBranchId)) {
      record.primaryBranchId = record.branchIds[0]!;
      record.primaryBranchName = mockBranchNameOf(organizationId, record.branchIds[0]!);
    }
    return toDetail(organizationId, record);
  },

  async listDepartments(organizationId: string): Promise<CatalogItem[]> {
    await delay(80);
    return structuredClone(stateOf(organizationId).departments);
  },

  async listDesignations(organizationId: string): Promise<CatalogItem[]> {
    await delay(80);
    return structuredClone(stateOf(organizationId).designations);
  },
};

/** Attendance read model: active staff visible to the caller. */
export function getMockActiveStaff(
  orgId: string,
): {
  id: string;
  fullName: string;
  staffCode: string;
  branchId: string;
  branchName: string;
  departmentId: string | null;
  departmentName: string | null;
}[] {
  const s = stateOf(orgId);
  return visibleStaff(orgId, s)
    .filter((r) => r.status === "active")
    .map((r) => ({
      id: r.id,
      fullName: r.fullName,
      staffCode: r.staffCode,
      branchId: r.primaryBranchId,
      branchName: r.primaryBranchName,
      departmentId: r.departmentId,
      departmentName: r.departmentName,
    }));
}


/* ------------------------------------------------------------------ */
/* Persistence seam (frontend-only local backup/restore).             */
/* The browser is the database: snapshots are written to IndexedDB.   */
/* ------------------------------------------------------------------ */

export function __serialize(): unknown {
  return state;
}

export function __restore(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  state = snapshot as typeof state;
}
