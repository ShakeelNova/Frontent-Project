import { mockFeesApi } from "@/api/mock/mock-fees";
import { contractUnavailable, getApiTransport } from "@/api/transport";
import type { PagedResult } from "./students";

/**
 * Fees service seam (Phase 7, tenant side). Assumed endpoints (CR-009):
 *   GET/POST   /organizations/{orgId}/fee-structures
 *   PATCH      /organizations/{orgId}/fee-structures/{id}
 *   POST       /organizations/{orgId}/fee-structures/{id}/generate-vouchers
 *   GET        /organizations/{orgId}/vouchers (paged; search/status/branchId/studentId)
 *   GET        /organizations/{orgId}/vouchers/{id}
 *   POST       /organizations/{orgId}/vouchers/{id}/payments   (manual entry)
 *   GET        /organizations/{orgId}/fees/report?from&to&branchId
 *
 * HARD RULES: money is ALWAYS integer minor units + an explicit currency
 * from the API — never assume PKR. Totals, balances and statuses are
 * backend-computed and rendered verbatim. Payments here are MANUAL
 * records only; there is no payment gateway and receipts must never imply
 * one. Mutations ride the central client (credentials + CSRF seam).
 */

export interface FeeComponent {
  name: string;
  amountMinor: number;
}

export interface FeeStructure {
  id: string;
  name: string;
  /** Human label from the API, e.g. "Matric Science · all classes". */
  appliesToLabel: string;
  programId: string | null;
  currency: string;
  components: FeeComponent[];
  /** Backend-computed sum of components. */
  totalMinor: number;
  isActive: boolean;
}

export interface FeeStructureInput {
  name: string;
  programId?: string | null;
  components: FeeComponent[];
  isActive: boolean;
}

export type VoucherStatus = "due" | "partially_paid" | "overdue" | "settled";

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  due: "Due",
  partially_paid: "Partially paid",
  overdue: "Overdue",
  settled: "Settled",
};

export interface VoucherSummary {
  id: string;
  voucherNumber: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  branchName: string;
  className: string | null;
  periodLabel: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  amountMinor: number;
  discountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  /** Backend-decided from balance + due date. */
  status: VoucherStatus;
}

export type PaymentMode = "cash" | "bank_transfer" | "cheque" | "other";

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export interface FeePayment {
  id: string;
  voucherId: string;
  /** Receipt number issued by the backend. */
  receiptNumber: string;
  date: string;
  amountMinor: number;
  currency: string;
  mode: PaymentMode;
  reference: string | null;
  recordedByName: string;
  /** Always manual in this phase — shown on receipts verbatim. */
  sourceLabel: string;
}

export interface VoucherDiscount {
  label: string;
  amountMinor: number;
}

export interface VoucherDetail extends VoucherSummary {
  components: FeeComponent[];
  discounts: VoucherDiscount[];
  payments: FeePayment[];
}

export interface VoucherListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: VoucherStatus;
  branchId?: string;
  studentId?: string;
}

export interface RecordPaymentInput {
  date: string;
  amountMinor: number;
  mode: PaymentMode;
  reference?: string;
}

export interface GenerateVouchersInput {
  periodLabel: string;
  dueDate: string;
}

export interface GenerateVouchersResult {
  created: number;
  skippedExisting: number;
}

export interface FeesReportRow {
  branchName: string;
  collectedMinor: number;
  outstandingMinor: number;
  voucherCount: number;
  settledCount: number;
  overdueCount: number;
}

export interface FeesReport {
  from: string;
  to: string;
  currency: string;
  /** Backend-computed aggregates for the period. */
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  totalOverdueMinor: number;
  rows: FeesReportRow[];
}

const FEATURE = "Fees";

export async function listFeeStructures(organizationId: string): Promise<FeeStructure[]> {
  if (getApiTransport() === "mock") return mockFeesApi.listFeeStructures(organizationId);
  return contractUnavailable(FEATURE);
}
export async function createFeeStructure(
  organizationId: string,
  input: FeeStructureInput,
): Promise<FeeStructure> {
  if (getApiTransport() === "mock")
    return mockFeesApi.createFeeStructure(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateFeeStructure(
  organizationId: string,
  structureId: string,
  input: FeeStructureInput,
): Promise<FeeStructure> {
  if (getApiTransport() === "mock")
    return mockFeesApi.updateFeeStructure(organizationId, structureId, input);
  return contractUnavailable(FEATURE);
}
export async function generateVouchers(
  organizationId: string,
  structureId: string,
  input: GenerateVouchersInput,
): Promise<GenerateVouchersResult> {
  if (getApiTransport() === "mock")
    return mockFeesApi.generateVouchers(organizationId, structureId, input);
  return contractUnavailable(FEATURE);
}
export async function listVouchers(
  organizationId: string,
  params: VoucherListParams,
): Promise<PagedResult<VoucherSummary>> {
  if (getApiTransport() === "mock") return mockFeesApi.listVouchers(organizationId, params);
  return contractUnavailable(FEATURE);
}
export async function getVoucher(
  organizationId: string,
  voucherId: string,
): Promise<VoucherDetail> {
  if (getApiTransport() === "mock") return mockFeesApi.getVoucher(organizationId, voucherId);
  return contractUnavailable(FEATURE);
}
export async function recordPayment(
  organizationId: string,
  voucherId: string,
  input: RecordPaymentInput,
): Promise<VoucherDetail> {
  if (getApiTransport() === "mock")
    return mockFeesApi.recordPayment(organizationId, voucherId, input);
  return contractUnavailable(FEATURE);
}
export async function getFeesReport(
  organizationId: string,
  from: string,
  to: string,
  branchId?: string,
): Promise<FeesReport> {
  if (getApiTransport() === "mock")
    return mockFeesApi.getFeesReport(organizationId, from, to, branchId);
  return contractUnavailable(FEATURE);
}
