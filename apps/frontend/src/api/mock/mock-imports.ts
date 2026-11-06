/**
 * DEV/TEST-ONLY import fixtures (Phase 7) — upload → map → validate →
 * commit for students/staff/fees. Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints: CR-009.
 *
 * Backend-mirroring rules:
 * - CSV only in the dev mock (a real backend parses Excel server-side);
 *   other extensions → IMPORT_FILE_UNSUPPORTED. Size cap 512 KB →
 *   IMPORT_FILE_TOO_LARGE.
 * - Validation is computed HERE: required fields, formats, enum values,
 *   branch names, unknown student codes, duplicates (in-file and
 *   against existing records). Row results carry 1-based line numbers.
 * - Commit creates records through the same mock APIs the UI uses
 *   (createStudent / inviteStaff / fee voucher creation), so capacity,
 *   duplicate-invite and other backend rules still apply per row.
 * - File contents are kept in job memory only; nothing is logged.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { createMockVoucherForStudent } from "@/api/mock/mock-fees";
import { getMockMembership } from "@/api/mock/mock-portal";
import { getMockStudentByCode, mockStudentsApi } from "@/api/mock/mock-school";
import { mockStaffApi } from "@/api/mock/mock-staff";
import { minorUnitDivisor } from "@/lib/money";
import type {
  ImportField,
  ImportJob,
  ImportKind,
  ImportRowResult,
} from "@/api/services/imports";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

const FIELDS: Record<ImportKind, ImportField[]> = {
  students: [
    { key: "full_name", label: "Full name", required: true },
    { key: "date_of_birth", label: "Date of birth", required: true, hint: "YYYY-MM-DD" },
    { key: "gender", label: "Gender", required: false },
    { key: "email", label: "Email", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "branch", label: "Branch name", required: true },
    { key: "student_code", label: "Student code", required: false, hint: "Only if migrating existing codes" },
  ],
  staff: [
    { key: "full_name", label: "Full name", required: true },
    { key: "email", label: "Work email", required: true },
    { key: "branch", label: "Branch name", required: true },
    {
      key: "role",
      label: "Role",
      required: true,
      hint: "teacher, front_desk, accountant, branch_manager, general_manager",
    },
    { key: "department", label: "Department name", required: false },
    { key: "phone", label: "Phone", required: false },
  ],
  fees: [
    { key: "student_code", label: "Student code", required: true },
    { key: "period_label", label: "Period label", required: true, hint: "e.g. Nov 2026" },
    { key: "due_date", label: "Due date", required: true, hint: "YYYY-MM-DD" },
    { key: "amount", label: "Amount (major units)", required: true },
    { key: "component", label: "Component name", required: false, hint: "Defaults to “Fees”" },
  ],
};

const TEMPLATES: Record<ImportKind, string> = {
  students:
    "Full Name,Date of Birth,Gender,Email,Phone,Branch,Student Code\nExample Student,2012-05-14,Female,,+92 300 0000000,Main campus,\n",
  staff:
    "Full Name,Work Email,Branch,Role,Department,Phone\nExample Teacher,teacher@example.test,Main campus,teacher,Academics,\n",
  fees: "Student Code,Period,Due Date,Amount,Component\nSUN-1001,Nov 2026,2026-11-10,16000,Tuition\n",
};

/** Minimal CSV parser: quotes, embedded commas/newlines, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

interface StoredJob extends ImportJob {
  organizationId: string;
  /** Parsed data rows (excluding header), aligned to `headers`. */
  rows: string[][];
}

let jobs: StoredJob[] = [];
let seq = 0;

/** Test helper: clears import jobs between tests. */
export function __resetMockImports(): void {
  jobs = [];
  seq = 0;
}

function requireOrgAccess(orgId: string) {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  if (user!.kind !== "staff") mockError(403, "FORBIDDEN", "Imports are for authorized staff.");
  return getMockMembership(orgId);
}

function findJob(orgId: string, jobId: string): StoredJob {
  requireOrgAccess(orgId);
  const job = jobs.find((j) => j.id === jobId && j.organizationId === orgId);
  if (!job || job.status === "discarded") {
    mockError(404, "IMPORT_JOB_NOT_FOUND", "Import job not found.");
  }
  return job!;
}

function publicJob(job: StoredJob): ImportJob {
  const { organizationId: _org, rows: _rows, ...pub } = job;
  void _org;
  void _rows;
  return structuredClone(pub);
}

/** Row → field-keyed record using the saved mapping. */
function mappedRow(job: StoredJob, row: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  job.headers.forEach((header, i) => {
    const field = job.mapping[header];
    if (field) out[field] = (row[i] ?? "").trim();
  });
  return out;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_KEYS = ["teacher", "front_desk", "accountant", "branch_manager", "general_manager"];

async function validateRows(job: StoredJob): Promise<ImportRowResult[]> {
  const membership = requireOrgAccess(job.organizationId);
  const branchNames = new Map(membership.branches.map((b) => [b.name.toLowerCase(), b.id]));
  const fields = FIELDS[job.kind];
  const departments =
    job.kind === "staff" ? await mockStaffApi.listDepartments(job.organizationId) : [];
  const seenKeys = new Map<string, number>();
  return job.rows.map((row, idx) => {
    const line = idx + 2; // header is line 1
    const rec = mappedRow(job, row);
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const f of fields) {
      if (f.required && !rec[f.key]) errors.push(`${f.label} is required.`);
    }
    if (job.kind === "students") {
      if (rec.date_of_birth && !DATE_RE.test(rec.date_of_birth))
        errors.push("Date of birth must be YYYY-MM-DD.");
      if (rec.email && !EMAIL_RE.test(rec.email)) errors.push("Email looks invalid.");
      if (rec.branch && !branchNames.has(rec.branch.toLowerCase()))
        errors.push(`Unknown branch "${rec.branch}".`);
      if (rec.student_code && getMockStudentByCode(job.organizationId, rec.student_code))
        errors.push(`Student code ${rec.student_code} already exists.`);
      const key = `${rec.full_name ?? ""}|${rec.date_of_birth ?? ""}`.toLowerCase();
      if (rec.full_name && seenKeys.has(key))
        warnings.push(`Possible duplicate of line ${seenKeys.get(key)} (same name + DOB).`);
      else if (rec.full_name) seenKeys.set(key, line);
    }
    if (job.kind === "staff") {
      if (rec.email && !EMAIL_RE.test(rec.email)) errors.push("Work email looks invalid.");
      if (rec.branch && !branchNames.has(rec.branch.toLowerCase()))
        errors.push(`Unknown branch "${rec.branch}".`);
      if (rec.role && !ROLE_KEYS.includes(rec.role.toLowerCase()))
        errors.push(`Unknown role "${rec.role}".`);
      if (
        rec.department &&
        !departments.some((d) => d.name.toLowerCase() === rec.department!.toLowerCase())
      )
        warnings.push(`Department "${rec.department}" not found — will be left unset.`);
      const key = (rec.email ?? "").toLowerCase();
      if (key && seenKeys.has(key)) errors.push(`Duplicate email (also on line ${seenKeys.get(key)}).`);
      else if (key) seenKeys.set(key, line);
    }
    if (job.kind === "fees") {
      if (rec.student_code && !getMockStudentByCode(job.organizationId, rec.student_code))
        errors.push(`Unknown student code ${rec.student_code}.`);
      if (rec.due_date && !DATE_RE.test(rec.due_date)) errors.push("Due date must be YYYY-MM-DD.");
      if (rec.amount && !/^\d+(\.\d+)?$/.test(rec.amount.replace(/,/g, "")))
        errors.push("Amount must be a number.");
      const key = `${rec.student_code ?? ""}|${rec.period_label ?? ""}`.toLowerCase();
      if (rec.student_code && seenKeys.has(key))
        warnings.push(`Possible duplicate voucher (same student + period as line ${seenKeys.get(key)}).`);
      else if (rec.student_code) seenKeys.set(key, line);
    }
    return {
      line,
      status: errors.length ? ("error" as const) : warnings.length ? ("warning" as const) : ("ok" as const),
      messages: [...errors, ...warnings],
    };
  });
}

export const mockImportsApi = {
  async getImportFields(orgId: string, kind: ImportKind): Promise<ImportField[]> {
    await delay(80);
    requireOrgAccess(orgId);
    return structuredClone(FIELDS[kind]);
  },

  async getImportTemplate(orgId: string, kind: ImportKind): Promise<string> {
    await delay(80);
    requireOrgAccess(orgId);
    return TEMPLATES[kind];
  },

  async createImport(
    orgId: string,
    kind: ImportKind,
    fileName: string,
    csvText: string,
  ): Promise<ImportJob> {
    await delay();
    requireOrgAccess(orgId);
    if (!/\.csv$/i.test(fileName)) {
      mockError(422, "IMPORT_FILE_UNSUPPORTED", "Only CSV uploads are parsed in this environment.");
    }
    if (csvText.length > 512_000) {
      mockError(413, "IMPORT_FILE_TOO_LARGE", "File exceeds the 512 KB import limit.");
    }
    const parsed = parseCsv(csvText);
    if (parsed.length < 2) {
      mockError(422, "VALIDATION_ERROR", "The file needs a header row and at least one data row.");
    }
    const [headers, ...rows] = parsed as [string[], ...string[][]];
    // Best-effort auto-mapping by normalized header name (backend nicety).
    const fields = FIELDS[kind];
    const mapping: Record<string, string> = {};
    for (const header of headers) {
      const norm = header.toLowerCase().replace(/[^a-z]+/g, " ").trim();
      const match = fields.find(
        (f) =>
          f.label.toLowerCase() === norm ||
          f.key.replace(/_/g, " ") === norm ||
          norm.includes(f.label.toLowerCase().split(" ")[0]!) && norm.includes(f.key.split("_")[0]!),
      );
      mapping[header] = match?.key ?? "";
    }
    const job: StoredJob = {
      id: `imp-${++seq}`,
      organizationId: orgId,
      kind,
      fileName,
      status: "uploaded",
      headers,
      sampleRows: rows.slice(0, 3),
      totalRows: rows.length,
      mapping,
      validation: null,
      result: null,
      createdAtUtc: new Date().toISOString(),
      rows,
    };
    jobs = [job, ...jobs];
    return publicJob(job);
  },

  async listImports(orgId: string): Promise<ImportJob[]> {
    await delay(80);
    requireOrgAccess(orgId);
    return jobs.filter((j) => j.organizationId === orgId).map(publicJob);
  },

  async saveImportMapping(
    orgId: string,
    jobId: string,
    mapping: Record<string, string>,
  ): Promise<ImportJob> {
    await delay();
    const job = findJob(orgId, jobId);
    const mappedFields = new Set(Object.values(mapping).filter(Boolean));
    const missing = FIELDS[job.kind].filter((f) => f.required && !mappedFields.has(f.key));
    if (missing.length) {
      mockError(
        422,
        "IMPORT_MAPPING_INCOMPLETE",
        `Map the required field(s): ${missing.map((f) => f.label).join(", ")}.`,
      );
    }
    job.mapping = mapping;
    job.status = "mapped";
    job.validation = null;
    return publicJob(job);
  },

  async validateImport(orgId: string, jobId: string): Promise<ImportJob> {
    await delay();
    const job = findJob(orgId, jobId);
    if (job.status === "uploaded") {
      mockError(422, "IMPORT_MAPPING_INCOMPLETE", "Save a field mapping before validating.");
    }
    const rows = await validateRows(job);
    job.validation = {
      totalRows: rows.length,
      okCount: rows.filter((r) => r.status === "ok").length,
      warningCount: rows.filter((r) => r.status === "warning").length,
      errorCount: rows.filter((r) => r.status === "error").length,
      rows,
    };
    job.status = "validated";
    return publicJob(job);
  },

  async getImportErrorReport(orgId: string, jobId: string): Promise<string> {
    await delay(80);
    const job = findJob(orgId, jobId);
    if (!job.validation) mockError(422, "IMPORT_NOT_READY", "Validate the import first.");
    const lines = ["line,status,messages"];
    for (const r of job.validation!.rows) {
      if (r.status === "ok") continue;
      lines.push(`${r.line},${r.status},"${r.messages.join("; ").replace(/"/g, '""')}"`);
    }
    return lines.join("\n") + "\n";
  },

  async commitImport(orgId: string, jobId: string): Promise<ImportJob> {
    await delay(300);
    const job = findJob(orgId, jobId);
    if (job.status !== "validated" || !job.validation) {
      mockError(422, "IMPORT_NOT_READY", "Validate the import before committing.");
    }
    const membership = requireOrgAccess(orgId);
    const branchByName = new Map(membership.branches.map((b) => [b.name.toLowerCase(), b.id]));
    const departments =
      job.kind === "staff" ? await mockStaffApi.listDepartments(orgId) : [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    for (let i = 0; i < job.rows.length; i++) {
      const rowResult = job.validation!.rows[i]!;
      if (rowResult.status === "error") {
        skipped++;
        continue;
      }
      const rec = mappedRow(job, job.rows[i]!);
      try {
        if (job.kind === "students") {
          await mockStudentsApi.createStudent(orgId, {
            fullName: rec.full_name!,
            dateOfBirth: rec.date_of_birth!,
            gender: rec.gender || undefined,
            email: rec.email || undefined,
            phone: rec.phone || undefined,
            branchId: branchByName.get((rec.branch ?? "").toLowerCase())!,
          });
        } else if (job.kind === "staff") {
          await mockStaffApi.inviteStaff(orgId, {
            fullName: rec.full_name!,
            email: rec.email!,
            branchId: branchByName.get((rec.branch ?? "").toLowerCase())!,
            roleKey: (rec.role ?? "").toLowerCase(),
            departmentId: rec.department
              ? departments.find(
                  (d) => d.name.toLowerCase() === rec.department!.toLowerCase(),
                )?.id
              : undefined,
          });
        } else {
          const student = getMockStudentByCode(orgId, rec.student_code!)!;
          const amountMinor = Math.round(
            Number((rec.amount ?? "0").replace(/,/g, "")) * minorUnitDivisor(membership.currency),
          );
          const created = createMockVoucherForStudent(orgId, {
            studentId: student.studentId,
            studentName: student.fullName,
            studentCode: student.studentCode,
            branchId: student.branchId,
            branchName:
              membership.branches.find((b) => b.id === student.branchId)?.name ??
              student.branchId,
            className: null,
            periodLabel: rec.period_label!,
            dueDate: rec.due_date!,
            amountMinor,
            componentName: rec.component || "Fees",
          });
          if (!created) {
            skipped++;
            continue;
          }
        }
        imported++;
      } catch {
        failed++;
      }
    }
    job.result = { imported, skipped, failed };
    job.status = "committed";
    return publicJob(job);
  },

  async discardImport(orgId: string, jobId: string): Promise<ImportJob> {
    await delay();
    const job = findJob(orgId, jobId);
    job.status = "discarded";
    job.rows = [];
    return publicJob(job);
  },
};


/* Persistence seam */
export function __serialize(): unknown {
  return { jobs, seq };
}

export function __restore(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const value = snapshot as { jobs?: unknown; seq?: unknown };
  if (Array.isArray(value.jobs)) jobs = value.jobs as typeof jobs;
  if (typeof value.seq === "number") seq = value.seq;
}
