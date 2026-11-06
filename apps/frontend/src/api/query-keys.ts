/**
 * Centralized TanStack Query keys (audit fix: a single source of truth
 * for every query/mutation cache key instead of scattered array
 * literals). Builders return the exact historical array shapes so the
 * migration changed call sites only — cache identity is unchanged.
 *
 * Root builders (e.g. `adminRoot`, `feesRoot`) exist for prefix
 * invalidation: invalidating `["admin"]` refreshes the whole admin
 * catalogue after one mutation, `["fees"]` the fee ledger, etc.
 */

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    organizationsRoot: ["auth", "organizations"] as const,
    organizationsFor: (userId: string) => ["auth", "organizations", userId] as const,
  },

  organization: {
    academicYear: (orgId: string) => ["organizations", orgId, "academic-year"] as const,
    branchDetails: (orgId: string) => ["organizations", orgId, "branch-details"] as const,
    branches: (orgId: string | undefined) => ["organizations", orgId, "branches"] as const,
    preferences: (orgId: string) => ["organizations", orgId, "preferences"] as const,
    profile: (orgId: string) => ["organizations", orgId, "profile"] as const,
    setupStatus: (orgId: string | undefined) =>
      ["organizations", orgId, "setup-status"] as const,
  },

  dashboard: {
    root: ["dashboard"] as const,
    org: (orgId: string, range: string) => ["dashboard", "org", orgId, range] as const,
    branch: (orgId: string, branchId: string, range: string) =>
      ["dashboard", "branch", orgId, branchId, range] as const,
  },

  academics: {
    classes: (orgId: string) => ["academics", "classes", orgId] as const,
    classSubjects: (orgId: string, classId: string) =>
      ["academics", "class-subjects", orgId, classId] as const,
    programs: (orgId: string) => ["academics", "programs", orgId] as const,
    subjects: (orgId: string) => ["academics", "subjects", orgId] as const,
    timetable: (orgId: string, classId: string) =>
      ["academics", "timetable", orgId, classId] as const,
    years: (orgId: string) => ["academics", "years", orgId] as const,
  },

  students: {
    root: (orgId: string) => ["students", orgId] as const,
    detail: (orgId: string, studentId: string) => ["students", orgId, studentId] as const,
    listRoot: (orgId: string) => ["students", orgId, "list"] as const,
    list: (orgId: string, paramsKey: string) =>
      ["students", orgId, "list", paramsKey] as const,
  },

  staff: {
    detail: (orgId: string, staffId: string) => ["staff", orgId, staffId] as const,
    departments: (orgId: string) => ["staff", "departments", orgId] as const,
    designations: (orgId: string) => ["staff", "designations", orgId] as const,
    listRoot: (orgId: string) => ["staff", orgId, "list"] as const,
    list: (orgId: string, paramsKey: string) =>
      ["staff", orgId, "list", paramsKey] as const,
    roles: (orgId: string) => ["staff", "roles", orgId] as const,
  },

  attendance: {
    corrections: (orgId: string) => ["attendance", "corrections", orgId] as const,
    leaves: (orgId: string) => ["attendance", "leaves", orgId] as const,
    qrSession: (orgId: string, sessionId: string | null) =>
      ["attendance", "qr-session", orgId, sessionId] as const,
    staffRoot: (orgId: string) => ["attendance", "staff", orgId] as const,
    staff: (orgId: string, date: string, branch: string, department: string) =>
      ["attendance", "staff", orgId, date, branch, department] as const,
    staffOptions: (orgId: string) => ["attendance", "staff-options", orgId] as const,
    studentsRoot: (orgId: string) => ["attendance", "students", orgId] as const,
    students: (orgId: string, date: string, classId: string) =>
      ["attendance", "students", orgId, date, classId] as const,
  },

  devices: {
    list: (orgId: string) => ["devices", orgId] as const,
  },

  fees: {
    root: ["fees"] as const,
    report: (orgId: string, from: string, to: string, branchId: string) =>
      ["fees", "report", orgId, from, to, branchId] as const,
    structures: (orgId: string) => ["fees", "structures", orgId] as const,
    vouchersRoot: (orgId: string) => ["fees", "vouchers", orgId] as const,
    voucher: (orgId: string, voucherId: string) =>
      ["fees", "vouchers", orgId, voucherId] as const,
    vouchers: (
      orgId: string,
      q: string,
      status: string,
      branchId: string,
      page: number,
      pageSize: number,
    ) => ["fees", "vouchers", orgId, q, status, branchId, page, pageSize] as const,
  },

  imports: {
    fields: (orgId: string, kind: string) => ["imports", "fields", orgId, kind] as const,
    jobs: (orgId: string) => ["imports", "jobs", orgId] as const,
  },

  settings: {
    integrations: (orgId: string) => ["settings", "integrations", orgId] as const,
    rolesPermissions: (orgId: string) =>
      ["settings", "roles-permissions", orgId] as const,
    sessions: ["settings", "sessions"] as const,
  },

  billing: {
    subscription: (orgId: string) => ["subscription", orgId] as const,
  },

  admin: {
    root: ["admin"] as const,
    addons: ["admin", "addons"] as const,
    auditForEntity: (entityId: string) => ["admin", "audit", entityId] as const,
    audit: (entityType: string, actor: string, from: string, to: string) =>
      ["admin", "audit", entityType, actor, from, to] as const,
    margins: ["admin", "margins"] as const,
    overview: ["admin", "overview"] as const,
    plans: ["admin", "plans"] as const,
    planVersions: (planId: string) => ["admin", "plans", planId, "versions"] as const,
    planVersion: (planId: string, versionId: string) =>
      ["admin", "plans", planId, "versions", versionId] as const,
    pools: ["admin", "pools"] as const,
    quotes: ["admin", "quotes"] as const,
    quoteRules: ["admin", "quote-rules"] as const,
    rates: ["admin", "rates"] as const,
    resources: ["admin", "resources"] as const,
  },

  studentPortal: {
    attendance: (studentId: string) => ["student-portal", "attendance", studentId] as const,
    fees: (studentId: string) => ["student-portal", "fees", studentId] as const,
    myStudents: ["student-portal", "my-students"] as const,
    notices: (studentId: string) => ["student-portal", "notices", studentId] as const,
    results: (studentId: string) => ["student-portal", "results", studentId] as const,
    timetable: (studentId: string) => ["student-portal", "timetable", studentId] as const,
  },

  help: (featureId: string) => ["help", featureId] as const,
  invite: (token: string) => ["invite", token] as const,
  publicPlans: ["public", "plans"] as const,
};
