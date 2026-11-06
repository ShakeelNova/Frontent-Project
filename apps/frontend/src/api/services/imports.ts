import { mockImportsApi } from "@/api/mock/mock-imports";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Imports service seam (Phase 7). Assumed endpoints (CR-009):
 *   GET  /organizations/{orgId}/imports/fields?kind=
 *   GET  /organizations/{orgId}/imports/template?kind=        (CSV text)
 *   POST /organizations/{orgId}/imports                      (upload → job)
 *   GET  /organizations/{orgId}/imports                      (job history)
 *   POST /organizations/{orgId}/imports/{jobId}/mapping
 *   POST /organizations/{orgId}/imports/{jobId}/validate
 *   GET  /organizations/{orgId}/imports/{jobId}/error-report (CSV text)
 *   POST /organizations/{orgId}/imports/{jobId}/commit
 *   POST /organizations/{orgId}/imports/{jobId}/discard
 *
 * HARD RULES: the file goes to the API — the browser never logs row
 * contents, never invents validation results, and commit is always an
 * explicit user action after backend validation. Async backends are
 * supported by shape (job status is polled/refetched by the UI).
 */

export type ImportKind = "students" | "staff" | "fees";

export const IMPORT_KIND_LABELS: Record<ImportKind, string> = {
  students: "Students",
  staff: "Staff",
  fees: "Fee vouchers",
};

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export type ImportJobStatus =
  | "uploaded"
  | "mapped"
  | "validated"
  | "committed"
  | "discarded";

export const IMPORT_STATUS_LABELS: Record<ImportJobStatus, string> = {
  uploaded: "Uploaded",
  mapped: "Mapped",
  validated: "Validated",
  committed: "Committed",
  discarded: "Discarded",
};

export interface ImportRowResult {
  /** 1-based line number in the source file (header = line 1). */
  line: number;
  status: "ok" | "warning" | "error";
  messages: string[];
}

export interface ImportValidation {
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
  rows: ImportRowResult[];
}

export interface ImportCommitResult {
  imported: number;
  skipped: number;
  failed: number;
}

export interface ImportJob {
  id: string;
  kind: ImportKind;
  fileName: string;
  status: ImportJobStatus;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  /** source header → backend field key ("" = ignore). */
  mapping: Record<string, string>;
  validation: ImportValidation | null;
  result: ImportCommitResult | null;
  createdAtUtc: string;
}

const FEATURE = "Imports";

export async function getImportFields(
  organizationId: string,
  kind: ImportKind,
): Promise<ImportField[]> {
  if (getApiTransport() === "mock") return mockImportsApi.getImportFields(organizationId, kind);
  return contractUnavailable(FEATURE);
}
export async function getImportTemplate(
  organizationId: string,
  kind: ImportKind,
): Promise<string> {
  if (getApiTransport() === "mock")
    return mockImportsApi.getImportTemplate(organizationId, kind);
  return contractUnavailable(FEATURE);
}
export async function createImport(
  organizationId: string,
  kind: ImportKind,
  fileName: string,
  csvText: string,
): Promise<ImportJob> {
  if (getApiTransport() === "mock")
    return mockImportsApi.createImport(organizationId, kind, fileName, csvText);
  return contractUnavailable(FEATURE);
}
export async function listImports(organizationId: string): Promise<ImportJob[]> {
  if (getApiTransport() === "mock") return mockImportsApi.listImports(organizationId);
  return contractUnavailable(FEATURE);
}
export async function saveImportMapping(
  organizationId: string,
  jobId: string,
  mapping: Record<string, string>,
): Promise<ImportJob> {
  if (getApiTransport() === "mock")
    return mockImportsApi.saveImportMapping(organizationId, jobId, mapping);
  return contractUnavailable(FEATURE);
}
export async function validateImport(
  organizationId: string,
  jobId: string,
): Promise<ImportJob> {
  if (getApiTransport() === "mock") return mockImportsApi.validateImport(organizationId, jobId);
  return contractUnavailable(FEATURE);
}
export async function getImportErrorReport(
  organizationId: string,
  jobId: string,
): Promise<string> {
  if (getApiTransport() === "mock")
    return mockImportsApi.getImportErrorReport(organizationId, jobId);
  return contractUnavailable(FEATURE);
}
export async function commitImport(
  organizationId: string,
  jobId: string,
): Promise<ImportJob> {
  if (getApiTransport() === "mock") return mockImportsApi.commitImport(organizationId, jobId);
  return contractUnavailable(FEATURE);
}
export async function discardImport(
  organizationId: string,
  jobId: string,
): Promise<ImportJob> {
  if (getApiTransport() === "mock") return mockImportsApi.discardImport(organizationId, jobId);
  return contractUnavailable(FEATURE);
}
