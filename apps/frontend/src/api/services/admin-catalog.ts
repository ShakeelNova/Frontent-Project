import { mockAdminApi } from "@/api/mock/mock-admin";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Platform-admin catalogue seam (Phase 8, Fluxeaze-internal ONLY).
 * Assumed endpoints (CR-010), all under the platform-admin surface:
 *   GET    /admin/overview
 *   GET    /admin/resource-definitions
 *   GET    /admin/plans · GET /admin/plans/{planId}/versions
 *   GET    /admin/plans/{planId}/versions/{versionId}
 *   POST   /admin/plans/{planId}/versions            (create draft/clone)
 *   PATCH  /admin/plans/{planId}/versions/{versionId} (drafts only)
 *   POST   /admin/plans/{planId}/versions/{versionId}/{preview|approve|publish|retire|return-to-draft}
 *   GET/POST /admin/addons · PATCH …/addons/{id}/versions/{vid} · POST …/{action}
 *   GET    /admin/provider-rates · GET /admin/supply-pools · GET /admin/margins
 *   GET/POST /admin/quote-rules · PATCH /admin/quote-rules/{id}
 *   GET/POST /admin/quotes · POST /admin/quotes/{id}/{send|accept|reject|convert}
 *   GET    /admin/audit-events?entityType&actor&from&to&entityId
 *
 * HARD RULES:
 * - Internal cost/rate/margin data exists ONLY behind this admin seam and
 *   is rendered ONLY in the (admin) area — never in tenant UIs.
 * - Catalogue money is USD minor units from the API; credits are internal
 *   metered units, never money.
 * - Publishing never mutates existing subscriptions: they keep the plan
 *   version snapshot they were sold. The backend enforces this; the UI
 *   surfaces version references everywhere a subscription appears.
 * - Every call is platform-admin authorized by the backend (403 otherwise).
 */

export type VersionStatus = "draft" | "preview" | "approved" | "published" | "retired";

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  draft: "Draft",
  preview: "In preview",
  approved: "Approved",
  published: "Published",
  retired: "Retired",
};

export type VersionAction = "preview" | "approve" | "publish" | "retire" | "return_to_draft";

export type WarningLevel = "ok" | "warning" | "critical";

export interface ResourceDefinition {
  key: string;
  name: string;
  /** Unit allowances are counted in, e.g. "students", "GB", "emails / month". */
  unitLabel: string;
  /** What counts as one unit, as defined by the platform. */
  description: string;
  category: "capacity" | "communications" | "platform" | "integrations";
  /** Deferred integrations are defined for the future but not enabled. */
  availability: "available" | "not_enabled";
}

export interface PlanAllowanceEntry {
  resourceKey: string;
  /** Null = custom/unlimited (Enterprise) — never rendered as a number. */
  amount: number | null;
}

export interface EntitlementEntry {
  key: string;
  label: string;
  enabled: boolean;
}

export interface PlanFamily {
  id: string;
  key: string;
  name: string;
  tagline: string;
  sortOrder: number;
  publishedVersionId: string | null;
  publishedVersionLabel: string | null;
  versionCount: number;
}

export interface PlanVersion {
  id: string;
  planId: string;
  versionNumber: number;
  status: VersionStatus;
  /** Null = custom pricing. Subscription catalogue currency (USD). */
  basePriceMinor: number | null;
  currency: string;
  billingPeriod: "month" | "year";
  isHighlighted: boolean;
  allowances: PlanAllowanceEntry[];
  entitlements: EntitlementEntry[];
  effectiveFromUtc: string | null;
  createdByLabel: string;
  updatedByLabel: string;
  updatedAtUtc: string;
}

export interface PlanVersionInput {
  basePriceMinor: number | null;
  billingPeriod: "month" | "year";
  isHighlighted: boolean;
  allowances: PlanAllowanceEntry[];
  entitlements: EntitlementEntry[];
}

export interface AddonVersion {
  id: string;
  addonId: string;
  versionNumber: number;
  status: VersionStatus;
  priceMinor: number | null;
  currency: string;
  allowanceAmount: number | null;
  effectiveFromUtc: string | null;
  updatedByLabel: string;
  updatedAtUtc: string;
}

export interface Addon {
  id: string;
  name: string;
  description: string;
  resourceKey: string;
  linkedPlanIds: string[];
  versions: AddonVersion[];
}

export interface AddonDraftInput {
  name: string;
  description: string;
  resourceKey: string;
  linkedPlanIds: string[];
  priceMinor: number | null;
  allowanceAmount: number | null;
}

/** Internal provider cost — ADMIN ONLY. Never sent to tenant surfaces. */
export interface ProviderRate {
  id: string;
  resourceKey: string;
  providerLabel: string;
  unitCostMinor: number;
  currency: string;
  billingUnitLabel: string;
  effectiveFromUtc: string;
}

export interface SupplyPool {
  id: string;
  name: string;
  resourceKey: string;
  totalUnits: number;
  allocatedUnits: number;
  availableUnits: number;
  /** Backend-computed. */
  utilizationPercent: number;
  warningLevel: WarningLevel;
}

/** Internal margin estimate per published version — ADMIN ONLY. */
export interface PlanMargin {
  planId: string;
  versionId: string;
  versionLabel: string;
  priceMinor: number | null;
  currency: string;
  estimatedMonthlyCostMinor: number | null;
  marginPercent: number | null;
  warningLevel: WarningLevel;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "converted";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted to subscription",
};

export interface QuoteRule {
  id: string;
  name: string;
  description: string;
  /** When the rule applies, e.g. "Active students > 5,000". */
  conditionLabel: string;
  /** How the offer is derived, e.g. "Scale base + branch packs". */
  formulaLabel: string;
  isActive: boolean;
  updatedAtUtc: string;
}

export interface QuoteRuleInput {
  name: string;
  description: string;
  conditionLabel: string;
  formulaLabel: string;
  isActive: boolean;
}

export interface EnterpriseQuote {
  id: string;
  organizationId: string | null;
  organizationName: string;
  status: QuoteStatus;
  planId: string;
  /** Snapshot reference — conversion activates THIS exact version. */
  planVersionId: string;
  planVersionLabel: string;
  addonNames: string[];
  termsLabel: string;
  annualPriceMinor: number | null;
  currency: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  convertedSubscriptionId: string | null;
}

export interface QuoteInput {
  organizationName: string;
  organizationId?: string | null;
  planId: string;
  planVersionId: string;
  addonNames: string[];
  termsLabel: string;
  annualPriceMinor: number | null;
}

export type QuoteAction = "send" | "accept" | "reject" | "convert";

export type AuditEntityType = "plan_version" | "addon" | "quote" | "quote_rule" | "subscription";

export interface AuditEvent {
  id: string;
  occurredAtUtc: string;
  actorLabel: string;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: string;
  summary: string;
}

export interface AuditFilter {
  entityType?: AuditEntityType;
  entityId?: string;
  actorQuery?: string;
  from?: string;
  to?: string;
}

export interface AdminOverview {
  planCount: number;
  publishedVersionCount: number;
  draftVersionCount: number;
  versionsAwaitingApproval: number;
  openQuoteCount: number;
  poolsAtRisk: number;
  pools: SupplyPool[];
  margins: PlanMargin[];
  recentAudit: AuditEvent[];
}

const FEATURE = "Platform admin";

export async function getAdminOverview(): Promise<AdminOverview> {
  if (getApiTransport() === "mock") return mockAdminApi.getOverview();
  return contractUnavailable(FEATURE);
}
export async function listResourceDefinitions(): Promise<ResourceDefinition[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listResourceDefinitions();
  return contractUnavailable(FEATURE);
}
export async function listPlans(): Promise<PlanFamily[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listPlans();
  return contractUnavailable(FEATURE);
}
export async function listPlanVersions(planId: string): Promise<PlanVersion[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listPlanVersions(planId);
  return contractUnavailable(FEATURE);
}
export async function getPlanVersion(planId: string, versionId: string): Promise<PlanVersion> {
  if (getApiTransport() === "mock") return mockAdminApi.getPlanVersion(planId, versionId);
  return contractUnavailable(FEATURE);
}
export async function createPlanDraft(
  planId: string,
  cloneFromVersionId?: string,
): Promise<PlanVersion> {
  if (getApiTransport() === "mock") return mockAdminApi.createPlanDraft(planId, cloneFromVersionId);
  return contractUnavailable(FEATURE);
}
export async function updatePlanDraft(
  planId: string,
  versionId: string,
  input: PlanVersionInput,
): Promise<PlanVersion> {
  if (getApiTransport() === "mock") return mockAdminApi.updatePlanDraft(planId, versionId, input);
  return contractUnavailable(FEATURE);
}
export async function transitionPlanVersion(
  planId: string,
  versionId: string,
  action: VersionAction,
  options?: { effectiveFromUtc?: string },
): Promise<PlanVersion> {
  if (getApiTransport() === "mock")
    return mockAdminApi.transitionPlanVersion(planId, versionId, action, options);
  return contractUnavailable(FEATURE);
}
export async function listAddons(): Promise<Addon[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listAddons();
  return contractUnavailable(FEATURE);
}
export async function createAddon(input: AddonDraftInput): Promise<Addon> {
  if (getApiTransport() === "mock") return mockAdminApi.createAddon(input);
  return contractUnavailable(FEATURE);
}
export async function createAddonDraft(addonId: string, cloneFromVersionId?: string): Promise<Addon> {
  if (getApiTransport() === "mock") return mockAdminApi.createAddonDraft(addonId, cloneFromVersionId);
  return contractUnavailable(FEATURE);
}
export async function updateAddonDraft(
  addonId: string,
  versionId: string,
  input: AddonDraftInput,
): Promise<Addon> {
  if (getApiTransport() === "mock") return mockAdminApi.updateAddonDraft(addonId, versionId, input);
  return contractUnavailable(FEATURE);
}
export async function transitionAddonVersion(
  addonId: string,
  versionId: string,
  action: VersionAction,
): Promise<Addon> {
  if (getApiTransport() === "mock") return mockAdminApi.transitionAddonVersion(addonId, versionId, action);
  return contractUnavailable(FEATURE);
}
export async function listProviderRates(): Promise<ProviderRate[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listProviderRates();
  return contractUnavailable(FEATURE);
}
export async function listSupplyPools(): Promise<SupplyPool[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listSupplyPools();
  return contractUnavailable(FEATURE);
}
export async function listPlanMargins(): Promise<PlanMargin[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listPlanMargins();
  return contractUnavailable(FEATURE);
}
export async function listQuoteRules(): Promise<QuoteRule[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listQuoteRules();
  return contractUnavailable(FEATURE);
}
export async function createQuoteRule(input: QuoteRuleInput): Promise<QuoteRule> {
  if (getApiTransport() === "mock") return mockAdminApi.createQuoteRule(input);
  return contractUnavailable(FEATURE);
}
export async function updateQuoteRule(id: string, input: QuoteRuleInput): Promise<QuoteRule> {
  if (getApiTransport() === "mock") return mockAdminApi.updateQuoteRule(id, input);
  return contractUnavailable(FEATURE);
}
export async function listQuotes(): Promise<EnterpriseQuote[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listQuotes();
  return contractUnavailable(FEATURE);
}
export async function createQuote(input: QuoteInput): Promise<EnterpriseQuote> {
  if (getApiTransport() === "mock") return mockAdminApi.createQuote(input);
  return contractUnavailable(FEATURE);
}
export async function transitionQuote(id: string, action: QuoteAction): Promise<EnterpriseQuote> {
  if (getApiTransport() === "mock") return mockAdminApi.transitionQuote(id, action);
  return contractUnavailable(FEATURE);
}
export async function listAuditEvents(filter: AuditFilter = {}): Promise<AuditEvent[]> {
  if (getApiTransport() === "mock") return mockAdminApi.listAuditEvents(filter);
  return contractUnavailable(FEATURE);
}
