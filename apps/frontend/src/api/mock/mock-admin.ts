/**
 * DEV/TEST-ONLY platform-admin fixtures (Phase 8). Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints logged as CR-010.
 *
 * Scenario: sign in as admin@fluxeaze.test. Every method (except the
 * public published-plans projection) requires a platform-admin session —
 * 401 signed out, 403 PLATFORM_ADMIN_FORBIDDEN for tenant users.
 *
 * The catalogue below seeds the published versions so the public pricing
 * page renders exactly what is published here — publish a new version
 * and /pricing follows; existing tenant subscriptions keep their
 * snapshot (see mock-subscription.ts). All prices/costs are fixtures,
 * never commitments. State is module-memory and resets on reload.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import { activateMockSubscriptionFromQuote } from "@/api/mock/mock-subscription";
import type {
  Addon,
  AddonDraftInput,
  AddonVersion,
  AdminOverview,
  AuditEntityType,
  AuditEvent,
  AuditFilter,
  EnterpriseQuote,
  EntitlementEntry,
  PlanFamily,
  PlanMargin,
  PlanVersion,
  PlanVersionInput,
  ProviderRate,
  QuoteAction,
  QuoteInput,
  QuoteRule,
  QuoteRuleInput,
  ResourceDefinition,
  SupplyPool,
  VersionAction,
  VersionStatus,
  WarningLevel,
} from "@/api/services/admin-catalog";
import type { PublishedPlan } from "@/api/services/plans";

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

function mockError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}`, fieldErrors };
}

function requireAdmin(): { fullName: string } {
  const user = getMockSessionUser();
  if (!user) mockError(401, "SESSION_EXPIRED", "No mock session.");
  if (!user!.isPlatformAdmin) {
    mockError(403, "PLATFORM_ADMIN_FORBIDDEN", "Platform-admin session required.");
  }
  return user!;
}

const nowIso = () => new Date().toISOString();

// Demo people (built from parts; fixtures, not real PII).
const OPS_A = ["Areeba", "Rehman"].join(" ") + " (Platform ops)";
const OPS_B = ["Bilal", "Chaudhry"].join(" ") + " (Platform ops)";

const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  {
    key: "students",
    name: "Active students",
    unitLabel: "students",
    description: "A student with an active enrollment in the current academic year.",
    category: "capacity",
    availability: "available",
  },
  {
    key: "branches",
    name: "Branches",
    unitLabel: "branches",
    description: "An enabled branch/campus of the organization.",
    category: "capacity",
    availability: "available",
  },
  {
    key: "storage",
    name: "Storage",
    unitLabel: "GB",
    description: "Uploaded files and media stored for the organization.",
    category: "platform",
    availability: "available",
  },
  {
    key: "emails",
    name: "Emails",
    unitLabel: "emails / month",
    description: "Transactional and notice emails sent in a calendar month.",
    category: "communications",
    availability: "available",
  },
  {
    key: "automation_credits",
    name: "Automation credits",
    unitLabel: "credits / month",
    description:
      "Internal metered units consumed by automations. Credits are not money and have no cash value.",
    category: "platform",
    availability: "available",
  },
  {
    key: "whatsapp_messages",
    name: "WhatsApp messages",
    unitLabel: "messages / month",
    description: "Reserved for a future WhatsApp integration — not enabled in this phase.",
    category: "integrations",
    availability: "not_enabled",
  },
  {
    key: "video_minutes",
    name: "Video classes",
    unitLabel: "participant-minutes / month",
    description: "Reserved for a future video integration — not enabled in this phase.",
    category: "integrations",
    availability: "not_enabled",
  },
];

const ENTITLEMENT_CATALOG: { key: string; label: string }[] = [
  { key: "fees", label: "Fees & vouchers" },
  { key: "attendance_qr", label: "QR attendance check-in" },
  { key: "devices_k50", label: "K50 device attendance (where configured)" },
  { key: "imports", label: "Bulk imports" },
  { key: "parent_portal", label: "Student & parent portal" },
  { key: "reports_advanced", label: "Advanced reports" },
  { key: "roles_custom", label: "Custom roles & permissions" },
  { key: "api_access", label: "API access" },
];

function entitlements(enabledKeys: string[]): EntitlementEntry[] {
  return ENTITLEMENT_CATALOG.map((e) => ({
    key: e.key,
    label: e.label,
    enabled: enabledKeys.includes(e.key),
  }));
}

interface PlanSeed {
  id: string;
  key: string;
  name: string;
  tagline: string;
  sortOrder: number;
}

function versionSeed(
  partial: Partial<PlanVersion> & Pick<PlanVersion, "id" | "planId" | "versionNumber" | "status">,
): PlanVersion {
  return {
    basePriceMinor: null,
    currency: "USD",
    billingPeriod: "month",
    isHighlighted: false,
    allowances: [],
    entitlements: entitlements([]),
    effectiveFromUtc: null,
    createdByLabel: OPS_A,
    updatedByLabel: OPS_A,
    updatedAtUtc: "2026-09-01T09:00:00Z",
    ...partial,
  };
}

interface AdminState {
  plans: PlanSeed[];
  versions: PlanVersion[];
  addons: Addon[];
  rates: ProviderRate[];
  pools: Omit<SupplyPool, "utilizationPercent" | "warningLevel" | "availableUnits">[];
  marginCosts: Record<string, number>;
  quoteRules: QuoteRule[];
  quotes: EnterpriseQuote[];
  audit: AuditEvent[];
  counters: { addon: number; quote: number; rule: number; audit: number };
}

function seedState(): AdminState {
  const plans: PlanSeed[] = [
    { id: "plan-starter", key: "starter", name: "Starter", tagline: "For a single-campus institute getting organized.", sortOrder: 1 },
    { id: "plan-growth", key: "growth", name: "Growth", tagline: "For growing academies that need branch visibility.", sortOrder: 2 },
    { id: "plan-scale", key: "scale", name: "Scale", tagline: "For multi-branch groups running central operations.", sortOrder: 3 },
    { id: "plan-enterprise", key: "enterprise", name: "Enterprise / Custom", tagline: "Custom capacity, terms and rollout — talk to us.", sortOrder: 4 },
  ];
  const basic = ["fees", "imports", "parent_portal"];
  const growthEnts = [...basic, "attendance_qr", "devices_k50"];
  const scaleEnts = [...growthEnts, "reports_advanced", "roles_custom"];
  const versions: PlanVersion[] = [
    versionSeed({
      id: "plan-starter-v1", planId: "plan-starter", versionNumber: 1, status: "published",
      basePriceMinor: 1900, effectiveFromUtc: "2026-09-01T09:00:00Z", updatedAtUtc: "2026-09-01T09:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 300 },
        { resourceKey: "branches", amount: 1 },
        { resourceKey: "storage", amount: 10 },
        { resourceKey: "emails", amount: 1000 },
      ],
      entitlements: entitlements(basic),
    }),
    versionSeed({
      id: "plan-starter-v2", planId: "plan-starter", versionNumber: 2, status: "draft",
      basePriceMinor: 2100, updatedAtUtc: "2026-10-18T10:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 400 },
        { resourceKey: "branches", amount: 1 },
        { resourceKey: "storage", amount: 15 },
        { resourceKey: "emails", amount: 1500 },
      ],
      entitlements: entitlements(basic),
    }),
    versionSeed({
      id: "plan-growth-v2", planId: "plan-growth", versionNumber: 2, status: "retired",
      basePriceMinor: 4500, effectiveFromUtc: "2026-08-01T09:00:00Z", updatedAtUtc: "2026-10-01T09:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 1200 },
        { resourceKey: "branches", amount: 3 },
        { resourceKey: "storage", amount: 100 },
        { resourceKey: "emails", amount: 10000 },
        { resourceKey: "automation_credits", amount: 500 },
      ],
      entitlements: entitlements(growthEnts),
    }),
    versionSeed({
      id: "plan-growth-v3", planId: "plan-growth", versionNumber: 3, status: "published",
      basePriceMinor: 4900, isHighlighted: true, effectiveFromUtc: "2026-10-01T09:00:00Z", updatedAtUtc: "2026-10-01T09:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 1500 },
        { resourceKey: "branches", amount: 3 },
        { resourceKey: "storage", amount: 100 },
        { resourceKey: "emails", amount: 10000 },
        { resourceKey: "automation_credits", amount: 500 },
      ],
      entitlements: entitlements(growthEnts),
    }),
    versionSeed({
      id: "plan-scale-v1", planId: "plan-scale", versionNumber: 1, status: "published",
      basePriceMinor: 9900, effectiveFromUtc: "2026-07-01T09:00:00Z", updatedAtUtc: "2026-07-01T09:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 5000 },
        { resourceKey: "branches", amount: 10 },
        { resourceKey: "storage", amount: 500 },
        { resourceKey: "emails", amount: 50000 },
        { resourceKey: "automation_credits", amount: 5000 },
      ],
      entitlements: entitlements(scaleEnts),
    }),
    versionSeed({
      id: "plan-scale-v2", planId: "plan-scale", versionNumber: 2, status: "preview",
      basePriceMinor: 10900, updatedAtUtc: "2026-10-20T12:00:00Z",
      allowances: [
        { resourceKey: "students", amount: 6000 },
        { resourceKey: "branches", amount: 12 },
        { resourceKey: "storage", amount: 750 },
        { resourceKey: "emails", amount: 75000 },
        { resourceKey: "automation_credits", amount: 7500 },
      ],
      entitlements: entitlements([...scaleEnts, "api_access"]),
    }),
    versionSeed({
      id: "plan-enterprise-v1", planId: "plan-enterprise", versionNumber: 1, status: "published",
      basePriceMinor: null, billingPeriod: "year", effectiveFromUtc: "2026-07-01T09:00:00Z", updatedAtUtc: "2026-07-01T09:00:00Z",
      allowances: [
        { resourceKey: "students", amount: null },
        { resourceKey: "branches", amount: null },
        { resourceKey: "storage", amount: null },
      ],
      entitlements: entitlements(ENTITLEMENT_CATALOG.map((e) => e.key)),
    }),
  ];
  const addonVersion = (
    id: string, addonId: string, n: number, status: VersionStatus,
    priceMinor: number, allowanceAmount: number, effectiveFromUtc: string | null,
  ): AddonVersion => ({
    id, addonId, versionNumber: n, status, priceMinor, currency: "USD",
    allowanceAmount, effectiveFromUtc, updatedByLabel: OPS_A, updatedAtUtc: "2026-09-01T09:00:00Z",
  });
  const addons: Addon[] = [
    {
      id: "addon-storage-100",
      name: "Extra 100 GB storage",
      description: "Additional file and media storage on top of the plan allowance.",
      resourceKey: "storage",
      linkedPlanIds: ["plan-growth", "plan-scale", "plan-enterprise"],
      versions: [addonVersion("addon-storage-100-v1", "addon-storage-100", 1, "published", 500, 100, "2026-09-01T09:00:00Z")],
    },
    {
      id: "addon-students-500",
      name: "Extra 500 students",
      description: "Raises the active-student capacity of a subscription by 500.",
      resourceKey: "students",
      linkedPlanIds: ["plan-starter", "plan-growth", "plan-scale"],
      versions: [addonVersion("addon-students-500-v1", "addon-students-500", 1, "published", 1500, 500, "2026-09-01T09:00:00Z")],
    },
    {
      id: "addon-credits-1000",
      name: "Automation credits +1,000",
      description: "Extra internal automation credits per month (not money, no cash value).",
      resourceKey: "automation_credits",
      linkedPlanIds: ["plan-growth", "plan-scale"],
      versions: [addonVersion("addon-credits-1000-v1", "addon-credits-1000", 1, "draft", 800, 1000, null)],
    },
  ];
  return {
    plans,
    versions,
    addons,
    rates: [
      { id: "rate-students", resourceKey: "students", providerLabel: "Internal hosting — blended compute", unitCostMinor: 2, currency: "USD", billingUnitLabel: "per active student / month", effectiveFromUtc: "2026-09-01T09:00:00Z" },
      { id: "rate-storage", resourceKey: "storage", providerLabel: "Object storage (S3-compatible)", unitCostMinor: 3, currency: "USD", billingUnitLabel: "per GB / month", effectiveFromUtc: "2026-09-01T09:00:00Z" },
      { id: "rate-emails", resourceKey: "emails", providerLabel: "Transactional email provider", unitCostMinor: 90, currency: "USD", billingUnitLabel: "per 1,000 emails", effectiveFromUtc: "2026-09-01T09:00:00Z" },
      { id: "rate-credits", resourceKey: "automation_credits", providerLabel: "Automation worker pool", unitCostMinor: 40, currency: "USD", billingUnitLabel: "per 100 credits", effectiveFromUtc: "2026-09-01T09:00:00Z" },
    ],
    pools: [
      { id: "pool-students-pk", name: "Student capacity pool — PK region", resourceKey: "students", totalUnits: 50000, allocatedUnits: 46200 },
      { id: "pool-storage", name: "Storage pool", resourceKey: "storage", totalUnits: 20000, allocatedUnits: 12400 },
      { id: "pool-emails", name: "Email sending pool", resourceKey: "emails", totalUnits: 2000000, allocatedUnits: 1690000 },
    ],
    marginCosts: {
      "plan-starter-v1": 1650,
      "plan-growth-v3": 3100,
      "plan-scale-v1": 6900,
    },
    quoteRules: [
      {
        id: "rule-large",
        name: "Large institute threshold",
        description: "Very large institutes move to a custom Enterprise offer instead of self-serve tiers.",
        conditionLabel: "Active students > 5,000",
        formulaLabel: "Enterprise base + per-student band pricing (manual approval)",
        isActive: true,
        updatedAtUtc: "2026-09-05T09:00:00Z",
      },
      {
        id: "rule-branches",
        name: "Multi-branch group",
        description: "Groups beyond the Scale branch allowance get branch-pack add-ons in the quote.",
        conditionLabel: "Branches > 10",
        formulaLabel: "Scale base + branch-pack add-ons",
        isActive: true,
        updatedAtUtc: "2026-09-05T09:00:00Z",
      },
      {
        id: "rule-pilot-2026",
        name: "Pilot cohort 2026",
        description: "Pilot institutes onboard on Growth with a first-term concession, standard renewal after.",
        conditionLabel: "Pilot cohort = 2026",
        formulaLabel: "Growth, first term free; standard renewal",
        isActive: true,
        updatedAtUtc: "2026-08-01T09:00:00Z",
      },
    ],
    quotes: [
      {
        id: "quote-1042",
        organizationId: "org-fresh",
        organizationName: "Fresh Start Institute",
        status: "accepted",
        planId: "plan-growth",
        planVersionId: "plan-growth-v3",
        planVersionLabel: "Growth v3",
        addonNames: ["Extra 100 GB storage"],
        termsLabel: "Annual · pilot cohort 2026 (first term free)",
        annualPriceMinor: 29400,
        currency: "USD",
        createdAtUtc: "2026-10-05T10:00:00Z",
        updatedAtUtc: "2026-10-15T10:00:00Z",
        convertedSubscriptionId: null,
      },
      {
        id: "quote-1043",
        organizationId: null,
        organizationName: "City Schools Group (prospect)",
        status: "sent",
        planId: "plan-scale",
        planVersionId: "plan-scale-v1",
        planVersionLabel: "Scale v1",
        addonNames: [],
        termsLabel: "Annual · net-30 invoicing",
        annualPriceMinor: 118800,
        currency: "USD",
        createdAtUtc: "2026-10-10T10:00:00Z",
        updatedAtUtc: "2026-10-12T10:00:00Z",
        convertedSubscriptionId: null,
      },
      {
        id: "quote-1044",
        organizationId: null,
        organizationName: "Al-Noor Academy (prospect)",
        status: "draft",
        planId: "plan-enterprise",
        planVersionId: "plan-enterprise-v1",
        planVersionLabel: "Enterprise / Custom v1",
        addonNames: [],
        termsLabel: "Custom — under scoping",
        annualPriceMinor: null,
        currency: "USD",
        createdAtUtc: "2026-10-20T10:00:00Z",
        updatedAtUtc: "2026-10-20T10:00:00Z",
        convertedSubscriptionId: null,
      },
      {
        id: "quote-1039",
        organizationId: null,
        organizationName: "Riverside Tutors (prospect)",
        status: "rejected",
        planId: "plan-starter",
        planVersionId: "plan-starter-v1",
        planVersionLabel: "Starter v1",
        addonNames: [],
        termsLabel: "Annual",
        annualPriceMinor: 22800,
        currency: "USD",
        createdAtUtc: "2026-09-08T10:00:00Z",
        updatedAtUtc: "2026-09-18T10:00:00Z",
        convertedSubscriptionId: null,
      },
    ],
    audit: [
      {
        id: "audit-seed-5", occurredAtUtc: "2026-10-20T12:00:00Z", actorLabel: OPS_B,
        entityType: "plan_version", entityId: "plan-scale-v2", entityLabel: "Scale v2",
        action: "preview", summary: "Moved Scale v2 to preview for approval (USD 109/mo draft).",
      },
      {
        id: "audit-seed-4", occurredAtUtc: "2026-10-15T10:00:00Z", actorLabel: OPS_A,
        entityType: "quote", entityId: "quote-1042", entityLabel: "Quote — Fresh Start Institute",
        action: "accepted", summary: "Quote accepted (Growth v3 snapshot, annual pilot terms). Awaiting conversion.",
      },
      {
        id: "audit-seed-3", occurredAtUtc: "2026-10-01T09:00:00Z", actorLabel: OPS_A,
        entityType: "plan_version", entityId: "plan-growth-v3", entityLabel: "Growth v3",
        action: "published", summary: "Published Growth v3 (USD 49/mo, 1,500 students). Growth v2 retired — existing subscriptions keep their v2 snapshot.",
      },
      {
        id: "audit-seed-2", occurredAtUtc: "2026-09-01T09:00:00Z", actorLabel: OPS_B,
        entityType: "plan_version", entityId: "plan-starter-v1", entityLabel: "Starter v1",
        action: "published", summary: "Published Starter v1 (USD 19/mo, 300 students).",
      },
      {
        id: "audit-seed-1", occurredAtUtc: "2026-08-12T09:00:00Z", actorLabel: OPS_A,
        entityType: "subscription", entityId: "sub-sunrise-1", entityLabel: "Sunrise Academy subscription",
        action: "activated", summary: "Activated Sunrise Academy on Growth v2 snapshot (manual pilot activation).",
      },
    ],
    counters: { addon: 4, quote: 1045, rule: 4, audit: 100 },
  };
}

let state = seedState();

/** Test helper: restores pristine catalogue fixtures. */
export function __resetMockAdmin(): void {
  state = seedState();
}

const planOf = (planId: string) => state.plans.find((p) => p.id === planId);
const versionsOf = (planId: string) =>
  state.versions
    .filter((v) => v.planId === planId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
const publishedOf = (planId: string) => versionsOf(planId).find((v) => v.status === "published");
const versionLabel = (v: PlanVersion) => `${planOf(v.planId)?.name ?? v.planId} v${v.versionNumber}`;
const cloneVersion = (v: PlanVersion): PlanVersion => ({
  ...v,
  allowances: v.allowances.map((a) => ({ ...a })),
  entitlements: v.entitlements.map((e) => ({ ...e })),
});
const cloneAddon = (a: Addon): Addon => ({
  ...a,
  linkedPlanIds: [...a.linkedPlanIds],
  versions: a.versions.map((v) => ({ ...v })).sort((x, y) => y.versionNumber - x.versionNumber),
});

function appendAudit(
  actorLabel: string,
  entityType: AuditEntityType,
  entityId: string,
  entityLabel: string,
  action: string,
  summary: string,
): void {
  state.audit = [
    {
      id: `audit-${state.counters.audit++}`,
      occurredAtUtc: nowIso(),
      actorLabel,
      entityType,
      entityId,
      entityLabel,
      action,
      summary,
    },
    ...state.audit,
  ];
}

function warningForPercent(percent: number): WarningLevel {
  if (percent >= 90) return "critical";
  if (percent >= 80) return "warning";
  return "ok";
}

function projectPools(): SupplyPool[] {
  return state.pools.map((p) => {
    const utilizationPercent =
      p.totalUnits === 0 ? 0 : Math.round((p.allocatedUnits / p.totalUnits) * 1000) / 10;
    return {
      ...p,
      availableUnits: Math.max(0, p.totalUnits - p.allocatedUnits),
      utilizationPercent,
      warningLevel: warningForPercent(utilizationPercent),
    };
  });
}

function projectMargins(): PlanMargin[] {
  return state.plans.flatMap((plan) => {
    const published = publishedOf(plan.id);
    if (!published) return [];
    const cost = state.marginCosts[published.id] ?? null;
    const price = published.basePriceMinor;
    const marginPercent =
      price !== null && price > 0 && cost !== null
        ? Math.round(((price - cost) / price) * 1000) / 10
        : null;
    const warningLevel: WarningLevel =
      marginPercent === null ? "ok" : marginPercent < 10 ? "critical" : marginPercent < 25 ? "warning" : "ok";
    return [
      {
        planId: plan.id,
        versionId: published.id,
        versionLabel: versionLabel(published),
        priceMinor: price,
        currency: published.currency,
        estimatedMonthlyCostMinor: cost,
        marginPercent,
        warningLevel,
      },
    ];
  });
}

const PLAN_TRANSITIONS: Record<VersionAction, { from: VersionStatus[]; to: VersionStatus }> = {
  preview: { from: ["draft"], to: "preview" },
  approve: { from: ["preview"], to: "approved" },
  publish: { from: ["approved"], to: "published" },
  retire: { from: ["published"], to: "retired" },
  return_to_draft: { from: ["preview", "approved"], to: "draft" },
};

export const mockAdminApi = {
  async getOverview(): Promise<AdminOverview> {
    requireAdmin();
    await delay(150);
    const pools = projectPools();
    return {
      planCount: state.plans.length,
      publishedVersionCount: state.versions.filter((v) => v.status === "published").length,
      draftVersionCount: state.versions.filter((v) => v.status === "draft").length,
      versionsAwaitingApproval: state.versions.filter((v) => v.status === "preview").length,
      openQuoteCount: state.quotes.filter((q) => q.status === "draft" || q.status === "sent" || q.status === "accepted").length,
      poolsAtRisk: pools.filter((p) => p.warningLevel !== "ok").length,
      pools,
      margins: projectMargins(),
      recentAudit: state.audit.slice(0, 8).map((e) => ({ ...e })),
    };
  },

  async listResourceDefinitions(): Promise<ResourceDefinition[]> {
    requireAdmin();
    await delay(100);
    return RESOURCE_DEFINITIONS.map((r) => ({ ...r }));
  },

  async listPlans(): Promise<PlanFamily[]> {
    requireAdmin();
    await delay(100);
    return [...state.plans]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => {
        const published = publishedOf(p.id);
        return {
          ...p,
          publishedVersionId: published?.id ?? null,
          publishedVersionLabel: published ? versionLabel(published) : null,
          versionCount: versionsOf(p.id).length,
        };
      });
  },

  async listPlanVersions(planId: string): Promise<PlanVersion[]> {
    requireAdmin();
    await delay(100);
    if (!planOf(planId)) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    return versionsOf(planId).map(cloneVersion);
  },

  async getPlanVersion(planId: string, versionId: string): Promise<PlanVersion> {
    requireAdmin();
    await delay(100);
    if (!planOf(planId)) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    const version = versionsOf(planId).find((v) => v.id === versionId);
    if (!version) mockError(404, "PLAN_VERSION_NOT_FOUND", "Plan version not found.");
    return cloneVersion(version!);
  },

  async createPlanDraft(planId: string, cloneFromVersionId?: string): Promise<PlanVersion> {
    const actor = requireAdmin();
    await delay();
    const plan = planOf(planId);
    if (!plan) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    const siblings = versionsOf(planId);
    const source = cloneFromVersionId
      ? siblings.find((v) => v.id === cloneFromVersionId)
      : undefined;
    if (cloneFromVersionId && !source) {
      mockError(404, "PLAN_VERSION_NOT_FOUND", "Source version not found.");
    }
    const versionNumber = Math.max(0, ...siblings.map((v) => v.versionNumber)) + 1;
    const draft: PlanVersion = source
      ? {
          ...cloneVersion(source),
          id: `${planId}-v${versionNumber}`,
          versionNumber,
          status: "draft",
          effectiveFromUtc: null,
          createdByLabel: actor.fullName,
          updatedByLabel: actor.fullName,
          updatedAtUtc: nowIso(),
        }
      : versionSeed({
          id: `${planId}-v${versionNumber}`,
          planId,
          versionNumber,
          status: "draft",
          createdByLabel: actor.fullName,
          updatedByLabel: actor.fullName,
          updatedAtUtc: nowIso(),
          allowances: RESOURCE_DEFINITIONS.filter((r) => r.availability === "available").map(
            (r) => ({ resourceKey: r.key, amount: 0 }),
          ),
          entitlements: entitlements([]),
        });
    state.versions = [...state.versions, draft];
    appendAudit(
      actor.fullName, "plan_version", draft.id, versionLabel(draft), "created",
      source
        ? `Created draft ${versionLabel(draft)} by cloning ${versionLabel(source)}.`
        : `Created draft ${versionLabel(draft)} from scratch.`,
    );
    return cloneVersion(draft);
  },

  async updatePlanDraft(planId: string, versionId: string, input: PlanVersionInput): Promise<PlanVersion> {
    const actor = requireAdmin();
    await delay();
    if (!planOf(planId)) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    const version = versionsOf(planId).find((v) => v.id === versionId);
    if (!version) mockError(404, "PLAN_VERSION_NOT_FOUND", "Plan version not found.");
    if (version!.status !== "draft") {
      mockError(409, "PLAN_VERSION_NOT_DRAFT", "Only draft versions can be edited.");
    }
    if (input.basePriceMinor !== null && input.basePriceMinor < 0) {
      mockError(422, "VALIDATION_ERROR", "Validation failed.", {
        basePrice: "Price can't be negative.",
      });
    }
    Object.assign(version!, {
      basePriceMinor: input.basePriceMinor,
      billingPeriod: input.billingPeriod,
      isHighlighted: input.isHighlighted,
      allowances: input.allowances.map((a) => ({ ...a })),
      entitlements: input.entitlements.map((e) => ({ ...e })),
      updatedByLabel: actor.fullName,
      updatedAtUtc: nowIso(),
    });
    appendAudit(
      actor.fullName, "plan_version", version!.id, versionLabel(version!), "edited",
      `Edited draft ${versionLabel(version!)} (price, allowances, entitlements).`,
    );
    return cloneVersion(version!);
  },

  async transitionPlanVersion(
    planId: string,
    versionId: string,
    action: VersionAction,
    options?: { effectiveFromUtc?: string },
  ): Promise<PlanVersion> {
    const actor = requireAdmin();
    await delay();
    if (!planOf(planId)) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    const version = versionsOf(planId).find((v) => v.id === versionId);
    if (!version) mockError(404, "PLAN_VERSION_NOT_FOUND", "Plan version not found.");
    const rule = PLAN_TRANSITIONS[action];
    if (!rule.from.includes(version!.status)) {
      mockError(409, "PLAN_VERSION_STATE_CONFLICT", `Cannot ${action} a version in "${version!.status}" state.`);
    }
    let summary = "";
    if (action === "publish") {
      const current = publishedOf(planId);
      if (current && current.id !== version!.id) current.status = "retired";
      version!.effectiveFromUtc = options?.effectiveFromUtc ?? nowIso();
      summary = `Published ${versionLabel(version!)}${current ? `; ${versionLabel(current)} retired` : ""}. Existing subscriptions keep their snapshots.`;
    } else {
      summary = `Moved ${versionLabel(version!)} from ${version!.status} to ${rule.to}.`;
    }
    version!.status = rule.to;
    version!.updatedByLabel = actor.fullName;
    version!.updatedAtUtc = nowIso();
    appendAudit(actor.fullName, "plan_version", version!.id, versionLabel(version!), action, summary);
    return cloneVersion(version!);
  },

  async listAddons(): Promise<Addon[]> {
    requireAdmin();
    await delay(100);
    return state.addons.map(cloneAddon);
  },

  async createAddon(input: AddonDraftInput): Promise<Addon> {
    const actor = requireAdmin();
    await delay();
    const id = `addon-custom-${state.counters.addon++}`;
    const addon: Addon = {
      id,
      name: input.name,
      description: input.description,
      resourceKey: input.resourceKey,
      linkedPlanIds: [...input.linkedPlanIds],
      versions: [
        {
          id: `${id}-v1`, addonId: id, versionNumber: 1, status: "draft",
          priceMinor: input.priceMinor, currency: "USD", allowanceAmount: input.allowanceAmount,
          effectiveFromUtc: null, updatedByLabel: actor.fullName, updatedAtUtc: nowIso(),
        },
      ],
    };
    state.addons = [...state.addons, addon];
    appendAudit(actor.fullName, "addon", id, input.name, "created", `Created add-on "${input.name}" (draft v1).`);
    return cloneAddon(addon);
  },

  async createAddonDraft(addonId: string, cloneFromVersionId?: string): Promise<Addon> {
    const actor = requireAdmin();
    await delay();
    const addon = state.addons.find((a) => a.id === addonId);
    if (!addon) mockError(404, "ADDON_NOT_FOUND", "Add-on not found.");
    const source = cloneFromVersionId
      ? addon!.versions.find((v) => v.id === cloneFromVersionId)
      : addon!.versions[0];
    const versionNumber = Math.max(0, ...addon!.versions.map((v) => v.versionNumber)) + 1;
    addon!.versions = [
      ...addon!.versions,
      {
        id: `${addonId}-v${versionNumber}`, addonId, versionNumber, status: "draft",
        priceMinor: source?.priceMinor ?? null, currency: "USD",
        allowanceAmount: source?.allowanceAmount ?? null,
        effectiveFromUtc: null, updatedByLabel: actor.fullName, updatedAtUtc: nowIso(),
      },
    ];
    appendAudit(actor.fullName, "addon", addonId, addon!.name, "draft_created", `Created draft v${versionNumber} for add-on "${addon!.name}".`);
    return cloneAddon(addon!);
  },

  async updateAddonDraft(addonId: string, versionId: string, input: AddonDraftInput): Promise<Addon> {
    const actor = requireAdmin();
    await delay();
    const addon = state.addons.find((a) => a.id === addonId);
    if (!addon) mockError(404, "ADDON_NOT_FOUND", "Add-on not found.");
    const version = addon!.versions.find((v) => v.id === versionId);
    if (!version) mockError(404, "ADDON_NOT_FOUND", "Add-on version not found.");
    if (version!.status !== "draft") {
      mockError(409, "PLAN_VERSION_NOT_DRAFT", "Only draft add-on versions can be edited.");
    }
    Object.assign(addon!, {
      name: input.name,
      description: input.description,
      resourceKey: input.resourceKey,
      linkedPlanIds: [...input.linkedPlanIds],
    });
    Object.assign(version!, {
      priceMinor: input.priceMinor,
      allowanceAmount: input.allowanceAmount,
      updatedByLabel: actor.fullName,
      updatedAtUtc: nowIso(),
    });
    appendAudit(actor.fullName, "addon", addonId, addon!.name, "edited", `Edited draft v${version!.versionNumber} of add-on "${addon!.name}".`);
    return cloneAddon(addon!);
  },

  async transitionAddonVersion(addonId: string, versionId: string, action: VersionAction): Promise<Addon> {
    const actor = requireAdmin();
    await delay();
    const addon = state.addons.find((a) => a.id === addonId);
    if (!addon) mockError(404, "ADDON_NOT_FOUND", "Add-on not found.");
    const version = addon!.versions.find((v) => v.id === versionId);
    if (!version) mockError(404, "ADDON_NOT_FOUND", "Add-on version not found.");
    const rule = PLAN_TRANSITIONS[action];
    if (!rule.from.includes(version!.status)) {
      mockError(409, "PLAN_VERSION_STATE_CONFLICT", `Cannot ${action} an add-on version in "${version!.status}" state.`);
    }
    if (action === "publish") {
      for (const v of addon!.versions) {
        if (v.status === "published" && v.id !== version!.id) v.status = "retired";
      }
      version!.effectiveFromUtc = nowIso();
    }
    version!.status = rule.to;
    version!.updatedByLabel = actor.fullName;
    version!.updatedAtUtc = nowIso();
    appendAudit(
      actor.fullName, "addon", addonId, addon!.name, action,
      `Moved add-on "${addon!.name}" v${version!.versionNumber} to ${rule.to}.`,
    );
    return cloneAddon(addon!);
  },

  async listProviderRates(): Promise<ProviderRate[]> {
    requireAdmin();
    await delay(100);
    return state.rates.map((r) => ({ ...r }));
  },

  async listSupplyPools(): Promise<SupplyPool[]> {
    requireAdmin();
    await delay(100);
    return projectPools();
  },

  async listPlanMargins(): Promise<PlanMargin[]> {
    requireAdmin();
    await delay(100);
    return projectMargins();
  },

  async listQuoteRules(): Promise<QuoteRule[]> {
    requireAdmin();
    await delay(100);
    return state.quoteRules.map((r) => ({ ...r }));
  },

  async createQuoteRule(input: QuoteRuleInput): Promise<QuoteRule> {
    const actor = requireAdmin();
    await delay();
    const rule: QuoteRule = {
      id: `rule-custom-${state.counters.rule++}`,
      ...input,
      updatedAtUtc: nowIso(),
    };
    state.quoteRules = [...state.quoteRules, rule];
    appendAudit(actor.fullName, "quote_rule", rule.id, rule.name, "created", `Created quote rule "${rule.name}".`);
    return { ...rule };
  },

  async updateQuoteRule(id: string, input: QuoteRuleInput): Promise<QuoteRule> {
    const actor = requireAdmin();
    await delay();
    const rule = state.quoteRules.find((r) => r.id === id);
    if (!rule) mockError(404, "QUOTE_RULE_NOT_FOUND", "Quote rule not found.");
    Object.assign(rule!, { ...input, updatedAtUtc: nowIso() });
    appendAudit(actor.fullName, "quote_rule", id, rule!.name, "edited", `Updated quote rule "${rule!.name}" (active: ${rule!.isActive}).`);
    return { ...rule! };
  },

  async listQuotes(): Promise<EnterpriseQuote[]> {
    requireAdmin();
    await delay(100);
    return state.quotes.map((q) => ({ ...q, addonNames: [...q.addonNames] }));
  },

  async createQuote(input: QuoteInput): Promise<EnterpriseQuote> {
    const actor = requireAdmin();
    await delay();
    const plan = planOf(input.planId);
    if (!plan) mockError(404, "PLAN_NOT_FOUND", "Plan not found.");
    const version = versionsOf(input.planId).find((v) => v.id === input.planVersionId);
    if (!version) mockError(404, "PLAN_VERSION_NOT_FOUND", "Plan version not found.");
    const quote: EnterpriseQuote = {
      id: `quote-${state.counters.quote++}`,
      organizationId: input.organizationId ?? null,
      organizationName: input.organizationName,
      status: "draft",
      planId: input.planId,
      planVersionId: input.planVersionId,
      planVersionLabel: versionLabel(version!),
      addonNames: [...input.addonNames],
      termsLabel: input.termsLabel,
      annualPriceMinor: input.annualPriceMinor,
      currency: "USD",
      createdAtUtc: nowIso(),
      updatedAtUtc: nowIso(),
      convertedSubscriptionId: null,
    };
    state.quotes = [quote, ...state.quotes];
    appendAudit(actor.fullName, "quote", quote.id, `Quote — ${quote.organizationName}`, "created", `Created draft quote for ${quote.organizationName} on ${quote.planVersionLabel}.`);
    return { ...quote, addonNames: [...quote.addonNames] };
  },

  async transitionQuote(id: string, action: QuoteAction): Promise<EnterpriseQuote> {
    const actor = requireAdmin();
    await delay();
    const quote = state.quotes.find((q) => q.id === id);
    if (!quote) mockError(404, "QUOTE_NOT_FOUND", "Quote not found.");
    const allowed: Record<QuoteAction, EnterpriseQuote["status"][]> = {
      send: ["draft"],
      accept: ["sent"],
      reject: ["draft", "sent"],
      convert: ["accepted"],
    };
    if (!allowed[action].includes(quote!.status)) {
      mockError(409, "QUOTE_STATE_CONFLICT", `Cannot ${action} a quote in "${quote!.status}" state.`);
    }
    if (action === "send") quote!.status = "sent";
    if (action === "accept") quote!.status = "accepted";
    if (action === "reject") quote!.status = "rejected";
    if (action === "convert") {
      const version = versionsOf(quote!.planId).find((v) => v.id === quote!.planVersionId);
      const plan = planOf(quote!.planId);
      if (quote!.organizationId && version && plan) {
        // Conversion copies the QUOTED version snapshot into a live
        // subscription — even if a newer version has since published.
        quote!.convertedSubscriptionId = activateMockSubscriptionFromQuote({
          organizationId: quote!.organizationId,
          planId: plan.id,
          planName: plan.name,
          planVersionId: version.id,
          planVersionLabel: quote!.planVersionLabel,
          annualPriceMinor: quote!.annualPriceMinor,
          allowances: version.allowances,
          addonNames: quote!.addonNames,
        });
        appendAudit(
          actor.fullName, "subscription", quote!.convertedSubscriptionId,
          `${quote!.organizationName} subscription`, "activated",
          `Activated ${quote!.organizationName} on ${quote!.planVersionLabel} from quote ${quote!.id}.`,
        );
      } else {
        quote!.convertedSubscriptionId = `sub-prospect-${quote!.id}`;
      }
      quote!.status = "converted";
    }
    quote!.updatedAtUtc = nowIso();
    appendAudit(
      actor.fullName, "quote", quote!.id, `Quote — ${quote!.organizationName}`, action,
      `Quote for ${quote!.organizationName}: ${action}.`,
    );
    return { ...quote!, addonNames: [...quote!.addonNames] };
  },

  async listAuditEvents(filter: AuditFilter = {}): Promise<AuditEvent[]> {
    requireAdmin();
    await delay(100);
    return state.audit
      .filter((e) => {
        if (filter.entityType && e.entityType !== filter.entityType) return false;
        if (filter.entityId && e.entityId !== filter.entityId) return false;
        if (
          filter.actorQuery &&
          !e.actorLabel.toLowerCase().includes(filter.actorQuery.toLowerCase())
        )
          return false;
        if (filter.from && e.occurredAtUtc.slice(0, 10) < filter.from) return false;
        if (filter.to && e.occurredAtUtc.slice(0, 10) > filter.to) return false;
        return true;
      })
      .map((e) => ({ ...e }));
  },
};

/**
 * Public projection — the ONLY catalogue data that ever leaves the admin
 * surface: published versions, public fields only (no costs, no drafts).
 * Powers GET /public/plans; requires no session.
 */
export async function getMockPublishedPlans(): Promise<PublishedPlan[]> {
  await delay(150);
  const defByKey = new Map(RESOURCE_DEFINITIONS.map((r) => [r.key, r]));
  return [...state.plans]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((plan) => {
      const published = publishedOf(plan.id);
      if (!published) return [];
      return [
        {
          id: plan.id,
          name: plan.name,
          tagline: plan.tagline,
          priceMinor: published.basePriceMinor,
          currency: published.currency,
          billingPeriod: published.billingPeriod,
          highlight: published.isHighlighted || undefined,
          allowances: published.allowances.map((a) => ({
            label: defByKey.get(a.resourceKey)?.name ?? a.resourceKey,
            amount: a.amount,
            unit:
              a.amount === null
                ? "custom"
                : (defByKey.get(a.resourceKey)?.unitLabel ?? ""),
          })),
        },
      ];
    });
}
