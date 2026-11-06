/**
 * DEV/TEST-ONLY fees fixtures (Phase 7) — structures, vouchers, manual
 * payments/receipts, reports. Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints: CR-009.
 *
 * Backend-mirroring rules:
 * - All amounts are integer minor units in the ORG's currency (from
 *   mock-portal membership). PKR is zero-decimal, so minor == major.
 * - Voucher status is computed HERE (backend stand-in): settled when
 *   balance <= 0; overdue when balance > 0 and dueDate < today;
 *   partially_paid when some payment exists; else due.
 * - Payments are MANUAL records (sourceLabel says so). Overpayment →
 *   PAYMENT_EXCEEDS_BALANCE (422, field `amount`); paying a settled
 *   voucher → VOUCHER_ALREADY_SETTLED (409); future payment date → 422.
 * - Branch managers only see vouchers in their authorized branches;
 *   non-staff sessions (guardian/student) get 403 on admin endpoints —
 *   the student portal uses separate linked-student helpers below.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { getMockMembership } from "@/api/mock/mock-portal";
import {
  getMockActiveStudents,
  getMockPrograms,
  mockVisibleBranchIds,
} from "@/api/mock/mock-school";
import type {
  FeeComponent,
  FeePayment,
  FeeStructure,
  FeeStructureInput,
  FeesReport,
  GenerateVouchersInput,
  PaymentMode,
  RecordPaymentInput,
  VoucherDetail,
  VoucherDiscount,
  VoucherListParams,
  VoucherStatus,
  VoucherSummary,
} from "@/api/services/fees";
import type { PagedResult } from "@/api/services/students";

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface VoucherRecord {
  id: string;
  voucherNumber: string;
  structureId: string | null;
  studentId: string;
  studentName: string;
  studentCode: string;
  branchId: string;
  branchName: string;
  className: string | null;
  periodLabel: string;
  issueDate: string;
  dueDate: string;
  components: FeeComponent[];
  discounts: VoucherDiscount[];
  payments: FeePayment[];
}

interface OrgFeesState {
  structures: FeeStructure[];
  vouchers: VoucherRecord[];
  voucherSeq: number;
  receiptSeq: number;
}

function statusOf(v: VoucherRecord, paidMinor: number, balanceMinor: number): VoucherStatus {
  if (balanceMinor <= 0) return "settled";
  if (v.dueDate < today()) return "overdue";
  return paidMinor > 0 ? "partially_paid" : "due";
}

function toSummary(orgId: string, v: VoucherRecord): VoucherSummary {
  const currency = getMockMembership(orgId).currency;
  const amountMinor = v.components.reduce((s, c) => s + c.amountMinor, 0);
  const discountMinor = v.discounts.reduce((s, d) => s + d.amountMinor, 0);
  const paidMinor = v.payments.reduce((s, p) => s + p.amountMinor, 0);
  const balanceMinor = amountMinor - discountMinor - paidMinor;
  return {
    id: v.id,
    voucherNumber: v.voucherNumber,
    studentId: v.studentId,
    studentName: v.studentName,
    studentCode: v.studentCode,
    branchName: v.branchName,
    className: v.className,
    periodLabel: v.periodLabel,
    issueDate: v.issueDate,
    dueDate: v.dueDate,
    currency,
    amountMinor: amountMinor - discountMinor,
    discountMinor,
    paidMinor,
    balanceMinor,
    status: statusOf(v, paidMinor, balanceMinor),
  };
}

function toDetail(orgId: string, v: VoucherRecord): VoucherDetail {
  return {
    ...toSummary(orgId, v),
    components: structuredClone(v.components),
    discounts: structuredClone(v.discounts),
    payments: structuredClone(v.payments),
  };
}

function seedOrg(orgId: string, prefix: string): OrgFeesState {
  const currency = getMockMembership(orgId).currency;
  const programs = getMockPrograms(orgId);
  const first = programs[0] ?? null;
  const second = programs[1] ?? null;
  const structures: FeeStructure[] = [];
  const comp = (name: string, amountMinor: number): FeeComponent => ({ name, amountMinor });
  if (first) {
    const components = [comp("Tuition", 12000), comp("Lab", 1500), comp("Transport", 2500)];
    structures.push({
      id: `fee-${prefix}-1`,
      name: `${first.name} — monthly`,
      appliesToLabel: `${first.name} · all classes`,
      programId: first.id,
      currency,
      components,
      totalMinor: components.reduce((s, c) => s + c.amountMinor, 0),
      isActive: true,
    });
  }
  if (second) {
    const components = [comp("Tuition", 18000), comp("Lab", 3000)];
    structures.push({
      id: `fee-${prefix}-2`,
      name: `${second.name} — monthly`,
      appliesToLabel: `${second.name} · all classes`,
      programId: second.id,
      currency,
      components,
      totalMinor: components.reduce((s, c) => s + c.amountMinor, 0),
      isActive: true,
    });
  }

  const vouchers: VoucherRecord[] = [];
  let voucherSeq = 1000;
  let receiptSeq = 5000;
  const actives = getMockActiveStudents(orgId);
  const seedStudents = actives.filter((s, i) => i < 10 || s.studentId === "stu-sun-1");
  const structureFor = (programId: string | null) =>
    structures.find((s) => s.programId === programId) ?? structures[0] ?? null;

  const pay = (
    voucherId: string,
    date: string,
    amountMinor: number,
    mode: PaymentMode,
    reference: string | null,
  ): FeePayment => ({
    id: `pay-${voucherId}-${date}`,
    voucherId,
    receiptNumber: `RCPT-${++receiptSeq}`,
    date,
    amountMinor,
    currency,
    mode,
    reference,
    recordedByName: "Front desk (mock)",
    sourceLabel: "Manually recorded payment",
  });

  seedStudents.forEach((s, i) => {
    const structure = structureFor(s.programId);
    if (!structure) return;
    const mk = (periodLabel: string, issueDate: string, dueDate: string, variant: number) => {
      const id = `vch-${prefix}-${++voucherSeq}`;
      const discounts: VoucherDiscount[] =
        variant === 3 ? [{ label: "Merit scholarship (mock)", amountMinor: 2000 }] : [];
      const net = structure.totalMinor - discounts.reduce((x, d) => x + d.amountMinor, 0);
      const payments: FeePayment[] = [];
      if (variant === 0 || variant === 3) {
        payments.push(pay(id, issueDate, net, "cash", null));
      } else if (variant === 1) {
        payments.push(pay(id, issueDate, Math.floor(net / 2), "bank_transfer", "TXN-MOCK-1"));
      }
      vouchers.push({
        id,
        voucherNumber: `VCH-2026-${voucherSeq}`,
        structureId: structure.id,
        studentId: s.studentId,
        studentName: s.fullName,
        studentCode: s.studentCode,
        branchId: s.branchId,
        branchName: s.branchName,
        className: s.className,
        periodLabel,
        issueDate,
        dueDate,
        components: structuredClone(structure.components),
        discounts,
        payments,
      });
    };
    // September: mostly settled; October: mixed (due/overdue/partial).
    mk("Sep 2026", "2026-09-01", "2026-09-10", i % 4 === 3 ? 2 : 0);
    mk("Oct 2026", "2026-10-01", "2026-10-10", i % 5);
  });

  return { structures, vouchers, voucherSeq, receiptSeq };
}

function makeFees(): Record<string, OrgFeesState> {
  return {
    "org-sunrise": seedOrg("org-sunrise", "sun"),
    "org-northgate": seedOrg("org-northgate", "nor"),
    "org-riverdale": seedOrg("org-riverdale", "riv"),
    "org-fresh": { structures: [], vouchers: [], voucherSeq: 1000, receiptSeq: 5000 },
  };
}

// Lazy: seeding reads org/students fixtures through session-gated
// helpers, so it must not run at module import (no session exists yet).
let fees: Record<string, OrgFeesState> | null = null;

/** Test helper: drops fees fixtures; they re-seed on next access. */
export function __resetMockFees(): void {
  fees = null;
}

function stateOf(orgId: string): OrgFeesState {
  fees ??= makeFees();
  const state = fees[orgId];
  if (!state) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return state!;
}

function requireStaffFees(orgId: string): Set<string> {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  if (user!.kind !== "staff") {
    mockError(403, "FORBIDDEN", "Fees administration is for authorized staff only.");
  }
  getMockMembership(orgId); // throws for unknown org / no access
  return mockVisibleBranchIds(orgId);
}

function findVoucher(orgId: string, voucherId: string): VoucherRecord {
  const state = stateOf(orgId);
  const visible = requireStaffFees(orgId);
  const voucher = state.vouchers.find((v) => v.id === voucherId);
  if (!voucher) mockError(404, "VOUCHER_NOT_FOUND", "Voucher not found.");
  if (!visible.has(voucher!.branchId)) {
    mockError(403, "BRANCH_FORBIDDEN", "This voucher belongs to a branch you can't access.");
  }
  return voucher!;
}

export const mockFeesApi = {
  async listFeeStructures(orgId: string): Promise<FeeStructure[]> {
    await delay(100);
    requireStaffFees(orgId);
    return structuredClone(stateOf(orgId).structures);
  },

  async createFeeStructure(
    orgId: string,
    input: FeeStructureInput,
  ): Promise<FeeStructure> {
    await delay();
    requireStaffFees(orgId);
    const state = stateOf(orgId);
    if (input.components.length === 0) {
      fieldError("components", "Add at least one fee component.");
    }
    const programs = getMockPrograms(orgId);
    const program = input.programId
      ? (programs.find((p) => p.id === input.programId) ?? null)
      : null;
    const structure: FeeStructure = {
      id: `fee-${orgId}-${Date.now()}`,
      name: input.name,
      appliesToLabel: program ? `${program.name} · all classes` : "All programs",
      programId: program?.id ?? null,
      currency: getMockMembership(orgId).currency,
      components: input.components,
      totalMinor: input.components.reduce((s, c) => s + c.amountMinor, 0),
      isActive: input.isActive,
    };
    state.structures = [...state.structures, structure];
    return structuredClone(structure);
  },

  async updateFeeStructure(
    orgId: string,
    structureId: string,
    input: FeeStructureInput,
  ): Promise<FeeStructure> {
    await delay();
    requireStaffFees(orgId);
    const state = stateOf(orgId);
    const existing = state.structures.find((s) => s.id === structureId);
    if (!existing) mockError(404, "FEE_STRUCTURE_NOT_FOUND", "Fee structure not found.");
    const programs = getMockPrograms(orgId);
    const program = input.programId
      ? (programs.find((p) => p.id === input.programId) ?? null)
      : null;
    Object.assign(existing!, {
      name: input.name,
      programId: program?.id ?? null,
      appliesToLabel: program ? `${program.name} · all classes` : "All programs",
      components: input.components,
      totalMinor: input.components.reduce((s, c) => s + c.amountMinor, 0),
      isActive: input.isActive,
    });
    return structuredClone(existing!);
  },

  async generateVouchers(orgId: string, structureId: string, input: GenerateVouchersInput) {
    await delay();
    const visible = requireStaffFees(orgId);
    const state = stateOf(orgId);
    const structure = state.structures.find((s) => s.id === structureId);
    if (!structure) mockError(404, "FEE_STRUCTURE_NOT_FOUND", "Fee structure not found.");
    let created = 0;
    let skippedExisting = 0;
    for (const s of getMockActiveStudents(orgId)) {
      if (!visible.has(s.branchId)) continue;
      if (structure!.programId && s.programId !== structure!.programId) continue;
      const exists = state.vouchers.some(
        (v) =>
          v.studentId === s.studentId &&
          v.periodLabel === input.periodLabel &&
          v.structureId === structure!.id,
      );
      if (exists) {
        skippedExisting++;
        continue;
      }
      const id = `vch-${orgId}-${++state.voucherSeq}`;
      state.vouchers.push({
        id,
        voucherNumber: `VCH-2026-${state.voucherSeq}`,
        structureId: structure!.id,
        studentId: s.studentId,
        studentName: s.fullName,
        studentCode: s.studentCode,
        branchId: s.branchId,
        branchName: s.branchName,
        className: s.className,
        periodLabel: input.periodLabel,
        issueDate: today(),
        dueDate: input.dueDate,
        components: structuredClone(structure!.components),
        discounts: [],
        payments: [],
      });
      created++;
    }
    return { created, skippedExisting };
  },

  async listVouchers(
    orgId: string,
    params: VoucherListParams,
  ): Promise<PagedResult<VoucherSummary>> {
    await delay(100);
    const visible = requireStaffFees(orgId);
    const state = stateOf(orgId);
    const q = (params.search ?? "").trim().toLowerCase();
    let rows = state.vouchers
      .filter((v) => visible.has(v.branchId))
      .map((v) => toSummary(orgId, v))
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
    if (q) {
      rows = rows.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentCode.toLowerCase().includes(q) ||
          r.voucherNumber.toLowerCase().includes(q),
      );
    }
    if (params.status) rows = rows.filter((r) => r.status === params.status);
    if (params.branchId) {
      const branchIds = state.vouchers
        .filter((v) => v.branchId === params.branchId)
        .map((v) => v.id);
      rows = rows.filter((r) => branchIds.includes(r.id));
    }
    if (params.studentId) rows = rows.filter((r) => r.studentId === params.studentId);
    const total = rows.length;
    const start = (params.page - 1) * params.pageSize;
    return {
      items: rows.slice(start, start + params.pageSize),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  },

  async getVoucher(orgId: string, voucherId: string): Promise<VoucherDetail> {
    await delay(100);
    return toDetail(orgId, findVoucher(orgId, voucherId));
  },

  async recordPayment(
    orgId: string,
    voucherId: string,
    input: RecordPaymentInput,
  ): Promise<VoucherDetail> {
    await delay();
    const voucher = findVoucher(orgId, voucherId);
    const summary = toSummary(orgId, voucher);
    if (summary.balanceMinor <= 0) {
      mockError(409, "VOUCHER_ALREADY_SETTLED", "This voucher is already settled.");
    }
    if (input.date > today()) fieldError("date", "Payment date can't be in the future.");
    if (input.amountMinor <= 0) fieldError("amount", "Enter an amount greater than zero.");
    if (input.amountMinor > summary.balanceMinor) {
      throw {
        status: 422,
        code: "PAYMENT_EXCEEDS_BALANCE",
        message: "Payment exceeds the outstanding balance.",
        requestId: "mock-payment-exceeds",
        fieldErrors: { amount: `More than the balance of ${summary.balanceMinor} minor units.` },
      };
    }
    const state = stateOf(orgId);
    const user = getMockSessionUser();
    voucher.payments.push({
      id: `pay-${voucherId}-${Date.now()}`,
      voucherId,
      receiptNumber: `RCPT-${++state.receiptSeq}`,
      date: input.date,
      amountMinor: input.amountMinor,
      currency: getMockMembership(orgId).currency,
      mode: input.mode,
      reference: input.reference?.trim() ? input.reference.trim() : null,
      recordedByName: user?.fullName.replace(" (mock)", "") ?? "Staff",
      sourceLabel: "Manually recorded payment",
    });
    return toDetail(orgId, voucher);
  },

  async getFeesReport(
    orgId: string,
    from: string,
    to: string,
    branchId?: string,
  ): Promise<FeesReport> {
    await delay(100);
    const visible = requireStaffFees(orgId);
    const state = stateOf(orgId);
    const byBranch = new Map<
      string,
      {
        branchName: string;
        collectedMinor: number;
        outstandingMinor: number;
        voucherCount: number;
        settledCount: number;
        overdueCount: number;
      }
    >();
    let totalOverdueMinor = 0;
    for (const v of state.vouchers) {
      if (!visible.has(v.branchId)) continue;
      if (branchId && v.branchId !== branchId) continue;
      const row = byBranch.get(v.branchId) ?? {
        branchName: v.branchName,
        collectedMinor: 0,
        outstandingMinor: 0,
        voucherCount: 0,
        settledCount: 0,
        overdueCount: 0,
      };
      const summary = toSummary(orgId, v);
      row.collectedMinor += v.payments
        .filter((p) => p.date >= from && p.date <= to)
        .reduce((s, p) => s + p.amountMinor, 0);
      if (v.issueDate <= to) {
        row.voucherCount++;
        row.outstandingMinor += Math.max(0, summary.balanceMinor);
        if (summary.status === "settled") row.settledCount++;
        if (summary.status === "overdue") {
          row.overdueCount++;
          totalOverdueMinor += Math.max(0, summary.balanceMinor);
        }
      }
      byBranch.set(v.branchId, row);
    }
    const rows = [...byBranch.values()].sort((a, b) =>
      a.branchName.localeCompare(b.branchName),
    );
    return {
      from,
      to,
      currency: getMockMembership(orgId).currency,
      totalCollectedMinor: rows.reduce((s, r) => s + r.collectedMinor, 0),
      totalOutstandingMinor: rows.reduce((s, r) => s + r.outstandingMinor, 0),
      totalOverdueMinor,
      rows,
    };
  },
};

/** Student-portal helper: vouchers for ONE linked student (no staff gate). */
export function getMockStudentVouchers(orgId: string, studentId: string): VoucherDetail[] {
  return stateOf(orgId)
    .vouchers.filter((v) => v.studentId === studentId)
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
    .map((v) => toDetail(orgId, v));
}

/** Fees-import helper: create a single-component voucher for a student. */
export function createMockVoucherForStudent(
  orgId: string,
  input: {
    studentId: string;
    studentName: string;
    studentCode: string;
    branchId: string;
    branchName: string;
    className: string | null;
    periodLabel: string;
    dueDate: string;
    amountMinor: number;
    componentName: string;
  },
): boolean {
  const state = stateOf(orgId);
  const exists = state.vouchers.some(
    (v) => v.studentId === input.studentId && v.periodLabel === input.periodLabel,
  );
  if (exists) return false;
  const id = `vch-${orgId}-imp-${++state.voucherSeq}`;
  state.vouchers.push({
    id,
    voucherNumber: `VCH-2026-${state.voucherSeq}`,
    structureId: null,
    studentId: input.studentId,
    studentName: input.studentName,
    studentCode: input.studentCode,
    branchId: input.branchId,
    branchName: input.branchName,
    className: input.className,
    periodLabel: input.periodLabel,
    issueDate: today(),
    dueDate: input.dueDate,
    components: [{ name: input.componentName, amountMinor: input.amountMinor }],
    discounts: [],
    payments: [],
  });
  return true;
}
