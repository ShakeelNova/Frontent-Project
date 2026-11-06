import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockFees } from "@/api/mock/mock-fees";
import { __resetMockImports } from "@/api/mock/mock-imports";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSchool } from "@/api/mock/mock-school";
import { __resetMockSettings } from "@/api/mock/mock-settings";
import { __resetMockStaff } from "@/api/mock/mock-staff";
import { signIn } from "@/api/services/auth";
import {
  generateVouchers,
  getFeesReport,
  getVoucher,
  listFeeStructures,
  listVouchers,
  recordPayment,
} from "@/api/services/fees";
import { getHelpArticle } from "@/api/services/help";
import {
  commitImport,
  createImport,
  getImportErrorReport,
  saveImportMapping,
  validateImport,
} from "@/api/services/imports";
import {
  changePassword,
  getRolesPermissions,
  listSessions,
  revokeOtherSessions,
  updateRolePermissions,
} from "@/api/services/settings";
import {
  getMyStudentAttendance,
  getMyStudentFees,
  getMyStudentResults,
  getMyStudents,
} from "@/api/services/student-portal";
import { listStudents } from "@/api/services/students";
import { parseMajorToMinor } from "@/lib/money";
import { beforeEach, describe, expect, it } from "vitest";

const ORG = "org-sunrise";

function resetAll() {
  resetAuthSession();
  __resetMockPortal();
  __resetMockSchool();
  __resetMockStaff();
  __resetMockFees();
  __resetMockImports();
  __resetMockSettings();
}

beforeEach(async () => {
  resetAll();
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
});

describe("money parsing", () => {
  it("converts major units by the currency exponent", () => {
    expect(parseMajorToMinor("1,250.50", "USD")).toBe(125050);
    expect(parseMajorToMinor("16000", "PKR")).toBe(16000);
    expect(parseMajorToMinor("abc", "USD")).toBeNull();
    expect(parseMajorToMinor("-5", "USD")).toBeNull();
  });
});

describe("fees (mock transport)", () => {
  it("structures carry org currency and backend totals", async () => {
    const structures = await listFeeStructures(ORG);
    expect(structures.length).toBeGreaterThan(0);
    expect(structures[0]!.currency).toBe("PKR");
    expect(structures[0]!.totalMinor).toBe(
      structures[0]!.components.reduce((s, c) => s + c.amountMinor, 0),
    );
  });

  it("seeded vouchers paginate, filter by status, and balances add up", async () => {
    const page = await listVouchers(ORG, { page: 1, pageSize: 5 });
    expect(page.total).toBeGreaterThan(5);
    const overdue = await listVouchers(ORG, { page: 1, pageSize: 50, status: "overdue" });
    expect(overdue.items.length).toBeGreaterThan(0);
    expect(overdue.items.every((v) => v.status === "overdue" && v.balanceMinor > 0)).toBe(true);
    const detail = await getVoucher(ORG, page.items[0]!.id);
    expect(detail.amountMinor - detail.paidMinor).toBe(detail.balanceMinor);
    expect(detail.components.length).toBeGreaterThan(0);
  });

  it("manual payments reduce the balance; overpay/settled/future are rejected", async () => {
    const list = await listVouchers(ORG, { page: 1, pageSize: 50, studentId: "stu-sun-1" });
    const oct = list.items.find((v) => v.periodLabel === "Oct 2026")!;
    const detail = await getVoucher(ORG, oct.id);

    if (detail.balanceMinor > 0) {
      const after = await recordPayment(ORG, oct.id, {
        date: "2026-10-20",
        amountMinor: 1000,
        mode: "cash",
      });
      expect(after.balanceMinor).toBe(detail.balanceMinor - 1000);
      expect(after.payments.at(-1)?.sourceLabel).toBe("Manually recorded payment");
      expect(after.payments.at(-1)?.receiptNumber).toMatch(/^RCPT-/);
    }

    const open = await getVoucher(ORG, oct.id);
    if (open.balanceMinor > 0) {
      await expect(
        recordPayment(ORG, oct.id, {
          date: "2026-10-20",
          amountMinor: open.balanceMinor + 1,
          mode: "cash",
        }),
      ).rejects.toMatchObject({ code: "PAYMENT_EXCEEDS_BALANCE" });
      await expect(
        recordPayment(ORG, oct.id, { date: "2999-01-01", amountMinor: 1, mode: "cash" }),
      ).rejects.toMatchObject({ status: 422 });
      const settled = await recordPayment(ORG, oct.id, {
        date: "2026-10-21",
        amountMinor: open.balanceMinor,
        mode: "bank_transfer",
        reference: "TXN-1",
      });
      expect(settled.status).toBe("settled");
      await expect(
        recordPayment(ORG, oct.id, { date: "2026-10-22", amountMinor: 1, mode: "cash" }),
      ).rejects.toMatchObject({ code: "VOUCHER_ALREADY_SETTLED" });
    }
  });

  it("generateVouchers creates a new period once (idempotent) and reports aggregate", async () => {
    const [structure] = await listFeeStructures(ORG);
    const first = await generateVouchers(ORG, structure!.id, {
      periodLabel: "Nov 2026",
      dueDate: "2026-11-10",
    });
    expect(first.created).toBeGreaterThan(0);
    const again = await generateVouchers(ORG, structure!.id, {
      periodLabel: "Nov 2026",
      dueDate: "2026-11-10",
    });
    expect(again.created).toBe(0);
    expect(again.skippedExisting).toBe(first.created);

    const report = await getFeesReport(ORG, "2026-09-01", "2026-10-31");
    expect(report.currency).toBe("PKR");
    expect(report.totalCollectedMinor).toBeGreaterThan(0);
    expect(report.rows.length).toBeGreaterThan(0);
  });

  it("Fresh org has honest empty fees", async () => {
    expect(await listFeeStructures("org-fresh")).toEqual([]);
    const vouchers = await listVouchers("org-fresh", { page: 1, pageSize: 10 });
    expect(vouchers.total).toBe(0);
  });
});

describe("student portal (mock transport)", () => {
  beforeEach(async () => {
    resetAll();
    await signIn({ email: "guardian@demo.fluxeaze.test", password: "password123" });
  });

  it("linked students come from the session", async () => {
    const students = await getMyStudents();
    expect(students.map((s) => s.id)).toEqual(["stu-sun-1", "stu-sun-2"]);
    expect(students[0]!.organizationName).toBe("Sunrise Academy");
    expect(students[0]!.timezone).toBe("Asia/Karachi");
  });

  it("fees/attendance/results are scoped to linked students only", async () => {
    const fees = await getMyStudentFees("stu-sun-1");
    expect(fees.length).toBeGreaterThan(0);
    expect(fees.every((v) => v.studentId === "stu-sun-1")).toBe(true);

    const attendance = await getMyStudentAttendance("stu-sun-1");
    const s = attendance.summary;
    expect(s.present + s.late + s.absent + s.excused).toBe(s.totalDays);
    expect(attendance.recent).toHaveLength(10);

    const results = await getMyStudentResults("stu-sun-1");
    expect(results.available).toBe(true);
    const unavailable = await getMyStudentResults("stu-sun-2");
    expect(unavailable.available).toBe(false);

    await expect(getMyStudentFees("stu-sun-10")).rejects.toMatchObject({
      code: "LINKED_STUDENT_FORBIDDEN",
    });
  });

  it("staff sessions are rejected by student-portal endpoints", async () => {
    resetAll();
    await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
    await expect(getMyStudents()).rejects.toMatchObject({ status: 403 });
  });
});

describe("imports (mock transport)", () => {
  const STUDENTS_CSV = [
    "Full Name,Date of Birth,Gender,Email,Phone,Branch,Student Code",
    "Import One,2013-03-02,Male,,,Main campus,",
    "Import Two,2012-07-09,Female,,,North campus,",
    "Bad Branch,2013-01-01,Male,,,Nowhere campus,",
    "Import One,2013-03-02,Male,,,Main campus,",
  ].join("\n");

  it("upload → map → validate → commit creates students and flags problems", async () => {
    const job = await createImport(ORG, "students", "students.csv", STUDENTS_CSV);
    expect(job.totalRows).toBe(4);
    expect(job.headers[0]).toBe("Full Name");

    const mapped = await saveImportMapping(ORG, job.id, {
      "Full Name": "full_name",
      "Date of Birth": "date_of_birth",
      Gender: "gender",
      Email: "email",
      Phone: "phone",
      Branch: "branch",
      "Student Code": "student_code",
    });
    expect(mapped.status).toBe("mapped");

    const validated = await validateImport(ORG, job.id);
    expect(validated.validation!.errorCount).toBe(1); // unknown branch
    expect(validated.validation!.warningCount).toBe(1); // duplicate name+DOB
    const badRow = validated.validation!.rows.find((r) => r.status === "error");
    expect(badRow!.line).toBe(4);
    expect(badRow!.messages.join(" ")).toMatch(/Unknown branch/);

    const report = await getImportErrorReport(ORG, job.id);
    expect(report).toContain("line,status,messages");
    expect(report).toContain("4,error");

    const committed = await commitImport(ORG, job.id);
    expect(committed.status).toBe("committed");
    expect(committed.result!.imported).toBe(3);
    expect(committed.result!.skipped).toBe(1);

    const found = await listStudents(ORG, { page: 1, pageSize: 10, search: "Import One" });
    expect(found.total).toBeGreaterThan(0);
  });

  it("rejects non-CSV files and incomplete mappings", async () => {
    await expect(createImport(ORG, "students", "students.xlsx", "")).rejects.toMatchObject({
      code: "IMPORT_FILE_UNSUPPORTED",
    });
    const job = await createImport(ORG, "students", "students.csv", STUDENTS_CSV);
    await expect(saveImportMapping(ORG, job.id, { "Full Name": "full_name" })).rejects.toMatchObject({
      code: "IMPORT_MAPPING_INCOMPLETE",
    });
  });

  it("fees import validates student codes and commits a voucher", async () => {
    const csv = [
      "Student Code,Period,Due Date,Amount,Component",
      "SUN-1001,Dec 2026,2026-12-10,16000,Tuition",
      "SUN-9999,Dec 2026,2026-12-10,16000,Tuition",
    ].join("\n");
    const job = await createImport(ORG, "fees", "fees.csv", csv);
    await saveImportMapping(ORG, job.id, {
      "Student Code": "student_code",
      Period: "period_label",
      "Due Date": "due_date",
      Amount: "amount",
      Component: "component",
    });
    const validated = await validateImport(ORG, job.id);
    expect(validated.validation!.errorCount).toBe(1);
    const committed = await commitImport(ORG, job.id);
    expect(committed.result!.imported).toBe(1);
    const vouchers = await listVouchers(ORG, {
      page: 1,
      pageSize: 10,
      studentId: "stu-sun-1",
      search: "VCH",
    });
    expect(vouchers.items.some((v) => v.periodLabel === "Dec 2026")).toBe(true);
  });
});

describe("settings (mock transport)", () => {
  it("roles metadata is backend-shaped; Owner is locked", async () => {
    const data = await getRolesPermissions(ORG);
    expect(data.catalog.length).toBeGreaterThan(5);
    const owner = data.roles.find((r) => r.roleKey === "owner")!;
    expect(owner.system).toBe(true);
    await expect(
      updateRolePermissions(ORG, "owner", { "students.view": false }),
    ).rejects.toMatchObject({ code: "ROLE_LOCKED" });

    const updated = await updateRolePermissions(ORG, "teacher", { "fees.view": true });
    expect(
      updated.roles.find((r) => r.roleKey === "teacher")!.permissions["fees.view"],
    ).toBe(true);
  });

  it("changePassword verifies the current password server-side", async () => {
    await expect(
      changePassword({ currentPassword: "incorrect123", newPassword: "newpass12345" }),
    ).rejects.toMatchObject({ code: "CURRENT_PASSWORD_INVALID" });
    await expect(
      changePassword({ currentPassword: "password123", newPassword: "newpass12345" }),
    ).resolves.toBeUndefined();
  });

  it("sessions can be revoked, keeping only the current one", async () => {
    const sessions = await listSessions();
    expect(sessions.filter((s) => s.current)).toHaveLength(1);
    const after = await revokeOtherSessions();
    expect(after).toHaveLength(1);
    expect(after[0]!.current).toBe(true);
  });
});

describe("help (mock transport)", () => {
  it("returns feature articles and null for unknown features", async () => {
    const article = await getHelpArticle("fees");
    expect(article?.title).toMatch(/Fees/);
    expect(article?.docUrl).toBeNull(); // never fabricate external URLs
    expect(await getHelpArticle("nope")).toBeNull();
  });
});
