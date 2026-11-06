/**
 * Centralized page-route helpers (audit fix: one source of truth for
 * application URLs instead of scattered string literals). Constants
 * cover the static routes; functions build dynamic/query variants.
 * Identical to the historical literals — the migration changed call
 * sites only.
 *
 * Scope: page/JSX navigation targets (`href`, `router.push/replace`,
 * nav configs). API endpoint paths and pathname guard comparisons
 * intentionally stay where they live.
 */

export const routes = {
  home: "/",
  pricing: "/pricing",
  requestPilot: "/request-pilot",
  designSystem: "/design-system",

  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    forgotPassword: "/auth/forgot-password",
    organizations: "/auth/organizations",
    signInNext: (next: string) => `/auth/sign-in?next=${next}` as const,
    signInNotice: (notice: string) => `/auth/sign-in?notice=${notice}` as const,
  },

  invite: (token: string) => `/invite/${token}` as const,

  portal: {
    root: "/portal",
    academics: "/portal/academics",
    academicsClasses: "/portal/academics/classes",
    academicsPrograms: "/portal/academics/programs",
    academicsSubjects: "/portal/academics/subjects",
    academicsYears: "/portal/academics/years",
    classTimetable: (classId: string) =>
      `/portal/academics/classes/${classId}/timetable` as const,
    attendance: "/portal/attendance",
    attendanceQr: "/portal/attendance/qr",
    attendanceRequests: "/portal/attendance/requests",
    attendanceStaff: "/portal/attendance/staff",
    attendanceStudents: "/portal/attendance/students",
    billing: "/portal/billing",
    branch: "/portal/branch",
    devices: "/portal/devices",
    fees: "/portal/fees",
    feesStructures: "/portal/fees/structures",
    feesVouchers: "/portal/fees/vouchers",
    feesVouchersOverdue: "/portal/fees/vouchers?status=overdue",
    feesVoucher: (voucherId: string) => `/portal/fees/vouchers/${voucherId}` as const,
    imports: "/portal/imports",
    importKind: (kind: string) => `/portal/imports/${kind}` as const,
    settings: "/portal/settings",
    settingsAcademic: "/portal/settings/academic",
    settingsAcademicYear: "/portal/settings/academic-year",
    settingsBranches: "/portal/settings/branches",
    settingsIntegrations: "/portal/settings/integrations",
    settingsOnboarding: "/portal/settings/onboarding",
    settingsPreferences: "/portal/settings/preferences",
    settingsRoles: "/portal/settings/roles",
    settingsSecurity: "/portal/settings/security",
    staff: "/portal/staff",
    staffMember: (staffId: string) => `/portal/staff/${staffId}` as const,
    students: "/portal/students",
    student: (studentId: string) => `/portal/students/${studentId}` as const,
  },

  student: {
    root: "/student",
    attendance: (studentId?: string) =>
      studentId ? `/student/attendance?student=${studentId}` : "/student/attendance",
    fees: (studentId?: string) =>
      studentId ? `/student/fees?student=${studentId}` : "/student/fees",
    notices: (studentId?: string) =>
      studentId ? `/student/notices?student=${studentId}` : "/student/notices",
    results: (studentId?: string) =>
      studentId ? `/student/results?student=${studentId}` : "/student/results",
    timetable: (studentId?: string) =>
      studentId ? `/student/timetable?student=${studentId}` : "/student/timetable",
  },

  admin: {
    root: "/admin",
    addons: "/admin/addons",
    audit: "/admin/audit",
    plans: "/admin/plans",
    quotes: "/admin/quotes",
    resources: "/admin/resources",
    plan: (planId: string) => `/admin/plans/${planId}` as const,
    planVersion: (planId: string, versionId: string) =>
      `/admin/plans/${planId}/versions/${versionId}` as const,
  },
} as const;
