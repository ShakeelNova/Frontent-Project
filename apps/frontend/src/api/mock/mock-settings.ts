/**
 * DEV/TEST-ONLY settings fixtures (Phase 7) — roles/permissions metadata
 * and account security. Enabled only via NEXT_PUBLIC_API_TRANSPORT=mock.
 * Assumed endpoints: CR-009.
 *
 * Backend-mirroring rules:
 * - The Owner role is a locked system role (ROLE_LOCKED on edit).
 * - Only owners may edit role permissions (others → 403).
 * - changePassword verifies the current password server-side; the dev
 *   mock rejects the literal "incorrect123" (and any <8 chars via field
 *   error upstream). Passwords are never stored or logged.
 * - Sessions are backend-listed; the current session can't be revoked
 *   from the list (sign out instead).
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { getMockMembership } from "@/api/mock/mock-portal";
import type {
  IntegrationFlag,
  PermissionDef,
  RolePermissions,
  RolesPermissions,
  UserSession,
} from "@/api/services/settings";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

function fieldError(field: string, message: string, code = "VALIDATION_ERROR"): never {
  throw {
    status: 422,
    code,
    message: "Validation failed.",
    requestId: "mock-validation",
    fieldErrors: { [field]: message },
  };
}

const CATALOG: PermissionDef[] = [
  { key: "students.view", label: "View students", group: "Students" },
  { key: "students.manage", label: "Add/edit students & enrollments", group: "Students" },
  { key: "staff.view", label: "View staff", group: "Staff" },
  { key: "staff.manage", label: "Invite/approve staff, edit profiles", group: "Staff" },
  { key: "attendance.view", label: "View attendance", group: "Attendance" },
  { key: "attendance.manage", label: "Mark attendance, run QR sessions", group: "Attendance" },
  { key: "fees.view", label: "View vouchers & reports", group: "Fees" },
  { key: "fees.manage", label: "Structures, generate vouchers, record payments", group: "Fees" },
  { key: "imports.run", label: "Run imports", group: "Operations" },
  { key: "reports.view", label: "View reports & dashboards", group: "Operations" },
  { key: "settings.manage", label: "Edit organization settings", group: "Administration" },
  { key: "roles.manage", label: "Change roles & permissions", group: "Administration" },
];

function perms(...on: string[]): Record<string, boolean> {
  return Object.fromEntries(CATALOG.map((p) => [p.key, on.includes(p.key)]));
}

function makeRoles(): RolePermissions[] {
  const all = CATALOG.map((p) => p.key);
  return [
    { roleKey: "owner", roleLabel: "Owner", system: true, memberCount: 1, permissions: perms(...all) },
    {
      roleKey: "general_manager",
      roleLabel: "General Manager",
      system: false,
      memberCount: 1,
      permissions: perms(...all.filter((k) => k !== "roles.manage")),
    },
    {
      roleKey: "branch_manager",
      roleLabel: "Branch Manager",
      system: false,
      memberCount: 2,
      permissions: perms(
        "students.view",
        "students.manage",
        "staff.view",
        "attendance.view",
        "attendance.manage",
        "fees.view",
        "reports.view",
      ),
    },
    {
      roleKey: "teacher",
      roleLabel: "Teacher",
      system: false,
      memberCount: 9,
      permissions: perms("students.view", "attendance.view", "attendance.manage"),
    },
    {
      roleKey: "accountant",
      roleLabel: "Accountant",
      system: false,
      memberCount: 1,
      permissions: perms("students.view", "fees.view", "fees.manage", "reports.view"),
    },
    {
      roleKey: "front_desk",
      roleLabel: "Front Desk",
      system: false,
      memberCount: 2,
      permissions: perms("students.view", "students.manage", "attendance.view", "fees.view"),
    },
  ];
}

let rolesByOrg = new Map<string, RolePermissions[]>();

function rolesOf(orgId: string): RolePermissions[] {
  if (!rolesByOrg.has(orgId)) rolesByOrg.set(orgId, makeRoles());
  return rolesByOrg.get(orgId)!;
}

function makeSessions(): UserSession[] {
  const now = Date.now();
  return [
    {
      id: "sess-current",
      deviceLabel: "This browser (mock)",
      locationLabel: "Karachi, PK (mock)",
      lastActiveUtc: new Date(now - 5 * 60_000).toISOString(),
      current: true,
    },
    {
      id: "sess-tablet",
      deviceLabel: "Tablet — Safari (mock)",
      locationLabel: "Karachi, PK (mock)",
      lastActiveUtc: new Date(now - 26 * 3600_000).toISOString(),
      current: false,
    },
    {
      id: "sess-office",
      deviceLabel: "Office desktop — Chrome (mock)",
      locationLabel: "Karachi, PK (mock)",
      lastActiveUtc: new Date(now - 3 * 24 * 3600_000).toISOString(),
      current: false,
    },
  ];
}

let sessions = makeSessions();

/** Test helper: restores pristine settings fixtures between tests. */
export function __resetMockSettings(): void {
  rolesByOrg.clear();
  sessions = makeSessions();
}

function requireUser() {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  return user!;
}

export const mockSettingsApi = {
  async getRolesPermissions(orgId: string): Promise<RolesPermissions> {
    await delay(100);
    requireUser();
    getMockMembership(orgId);
    return { catalog: structuredClone(CATALOG), roles: structuredClone(rolesOf(orgId)) };
  },

  async updateRolePermissions(
    orgId: string,
    roleKey: string,
    permissions: Record<string, boolean>,
  ): Promise<RolesPermissions> {
    await delay();
    requireUser();
    const membership = getMockMembership(orgId);
    if (membership.role !== "owner") {
      mockError(403, "FORBIDDEN", "Only organization owners can change role permissions.");
    }
    const role = rolesOf(orgId).find((r) => r.roleKey === roleKey);
    if (!role) mockError(404, "ROLE_NOT_FOUND", "Role not found.");
    if (role!.system) mockError(422, "ROLE_LOCKED", "System roles can't be edited.");
    for (const key of Object.keys(permissions)) {
      if (!CATALOG.some((p) => p.key === key)) fieldError("permissions", `Unknown permission ${key}.`);
    }
    role!.permissions = { ...role!.permissions, ...permissions };
    return { catalog: structuredClone(CATALOG), roles: structuredClone(rolesOf(orgId)) };
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await delay();
    requireUser();
    // Demo rule: the literal "incorrect123" stands in for a wrong password.
    if (input.currentPassword === "incorrect123" || input.currentPassword.length < 8) {
      fieldError("currentPassword", "Current password is incorrect.", "CURRENT_PASSWORD_INVALID");
    }
    if (input.newPassword === input.currentPassword) {
      fieldError("newPassword", "Choose a different password than your current one.");
    }
    // Success: backend rotates the credential; nothing is stored client-side.
  },

  async listSessions(): Promise<UserSession[]> {
    await delay(100);
    requireUser();
    return structuredClone(sessions);
  },

  async revokeSession(sessionId: string): Promise<UserSession[]> {
    await delay();
    requireUser();
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) mockError(404, "SESSION_NOT_FOUND", "Session not found.");
    if (target!.current) {
      mockError(422, "VALIDATION_ERROR", "Sign out to end the current session.");
    }
    sessions = sessions.filter((s) => s.id !== sessionId);
    return structuredClone(sessions);
  },

  async revokeOtherSessions(): Promise<UserSession[]> {
    await delay();
    requireUser();
    sessions = sessions.filter((s) => s.current);
    return structuredClone(sessions);
  },

  async getIntegrationFlags(orgId: string): Promise<IntegrationFlag[]> {
    await delay(100);
    // Membership gate like every tenant read; flags themselves are the
    // platform's truth — nothing deferred is ever reported as enabled.
    getMockMembership(orgId);
    return [
      {
        key: "whatsapp",
        name: "WhatsApp messaging",
        description: "Send notices and fee reminders over WhatsApp.",
        status: "not_enabled",
        noteLabel: "Admin-only integration pending — not enabled for your organization.",
      },
      {
        key: "video_classes",
        name: "Video classes",
        description: "Host live online classes from the timetable.",
        status: "not_enabled",
        noteLabel: "Not enabled in this phase.",
      },
      {
        key: "subscription_gateway",
        name: "Online subscription payments",
        description: "Pay Fluxeaze subscription invoices by card or bank.",
        status: "not_enabled",
        noteLabel: "Pilot billing is managed by the Fluxeaze team — no online checkout.",
      },
      {
        key: "fee_gateway",
        name: "Online school-fee payments",
        description: "Let guardians pay fee vouchers online.",
        status: "coming_soon",
        noteLabel: "Coming soon — record payments manually under Fees for now.",
      },
      {
        key: "payroll",
        name: "Payroll",
        description: "Salaries, deductions and payslips for staff.",
        status: "not_enabled",
        noteLabel: "Not part of the current scope.",
      },
      {
        key: "biometric_other",
        name: "Other biometric devices",
        description: "Fingerprint/face devices beyond the supported attendance terminals.",
        status: "not_enabled",
        noteLabel: "Only devices your backend reports as configured appear under Devices.",
      },
      {
        key: "native_mobile",
        name: "Native mobile apps",
        description: "iOS/Android apps for staff, students and guardians.",
        status: "coming_soon",
        noteLabel: "Coming soon — the web app is fully responsive meanwhile.",
      },
    ];
  },
};


/* Persistence seam */
export function __serialize(): unknown {
  return { rolesByOrg: Array.from(rolesByOrg.entries()), sessions };
}

export function __restore(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const value = snapshot as { rolesByOrg?: unknown; sessions?: unknown };
  if (Array.isArray(value.rolesByOrg)) {
    rolesByOrg = new Map(value.rolesByOrg as Array<[string, RolePermissions[]]>);
  }
  if (Array.isArray(value.sessions)) sessions = value.sessions as typeof sessions;
}
