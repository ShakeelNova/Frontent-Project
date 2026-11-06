/**
 * DEV/TEST-ONLY subscription fixtures (Phase 8). Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoint logged as CR-010.
 *
 * Demo scenarios (demo owner sign-in):
 * - org-sunrise:   Growth **v2 snapshot** (students cap 1,200 = the value
 *                  the Phase 4 dashboards use) while Growth v3 is the
 *                  published catalogue version — proof that publishing
 *                  never mutates existing subscriptions.
 * - org-northgate: Scale v1 (GM can view billing).
 * - org-riverdale: branch-manager role → 403 BILLING_FORBIDDEN.
 * - org-fresh:     no subscription yet (an accepted admin quote can be
 *                  converted to create one — see mock-admin.ts).
 * Student usage is read live from the portal fixtures so numbers always
 * agree with the dashboards. Nothing here is a real price commitment.
 */

import { getMockMembership } from "@/api/mock/mock-portal";
import type { WarningLevel } from "@/api/services/admin-catalog";
import type {
  OrgSubscription,
  SubscriptionAddon,
  SubscriptionEvent,
  SubscriptionResourceUsage,
} from "@/api/services/subscription";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

const BILLING_CONTACT = "support@fluxeaze.test";

interface ResourceSeed {
  key: string;
  included: number | null;
  used: number;
}

interface SubscriptionSeed extends Omit<OrgSubscription, "resources" | "billingContactEmail"> {
  resourceSeeds: ResourceSeed[];
}

const RESOURCE_META: Record<
  string,
  { label: string; unit: string; isCredits: boolean }
> = {
  students: { label: "Active students", unit: "students", isCredits: false },
  branches: { label: "Branches", unit: "branches", isCredits: false },
  storage: { label: "Storage", unit: "GB", isCredits: false },
  emails: { label: "Emails", unit: "emails / month", isCredits: false },
  automation_credits: { label: "Automation credits", unit: "credits / month", isCredits: true },
};

/** Deferred integrations — defined in the catalogue, not enabled. */
const DEFERRED_RESOURCES: SubscriptionResourceUsage[] = [
  {
    key: "whatsapp_messages",
    label: "WhatsApp messages",
    unit: "messages / month",
    included: null,
    used: 0,
    usagePercent: null,
    warningLevel: "ok",
    availability: "not_enabled",
    isCredits: false,
  },
  {
    key: "video_minutes",
    label: "Video classes",
    unit: "participant-minutes / month",
    included: null,
    used: 0,
    usagePercent: null,
    warningLevel: "ok",
    availability: "not_enabled",
    isCredits: false,
  },
];

function warningFor(percent: number | null): WarningLevel {
  if (percent === null) return "ok";
  if (percent >= 90) return "critical";
  if (percent >= 80) return "warning";
  return "ok";
}

function event(
  id: string,
  type: SubscriptionEvent["type"],
  occurredAtUtc: string,
  description: string,
  amountMinor: number | null,
  planVersionLabel: string,
): SubscriptionEvent {
  return { id, type, occurredAtUtc, description, amountMinor, currency: "USD", planVersionLabel };
}

const ADDONS_SHARED: SubscriptionAddon[] = [
  {
    id: "sub-addon-students-500",
    name: "Extra 500 students",
    description: "Raises the active-student capacity of this subscription.",
    allowanceLabel: "+500 students",
    priceMinor: 1500,
    currency: "USD",
    billingPeriod: "month",
    status: "available",
  },
  {
    id: "sub-addon-storage-100",
    name: "Extra 100 GB storage",
    description: "Additional file and media storage.",
    allowanceLabel: "+100 GB storage",
    priceMinor: 500,
    currency: "USD",
    billingPeriod: "month",
    status: "available",
  },
];

function seedSubscriptions(): Record<string, SubscriptionSeed> {
  return {
    "org-sunrise": {
      id: "sub-sunrise-1",
      planId: "plan-growth",
      planName: "Growth",
      planVersionId: "plan-growth-v2",
      planVersionLabel: "Growth v2",
      latestPublishedVersionLabel: "Growth v3",
      status: "active",
      priceMinor: 4500,
      currency: "USD",
      billingPeriod: "month",
      effectiveFromUtc: "2026-08-12T09:00:00Z",
      currentPeriodStartUtc: "2026-10-12T09:00:00Z",
      currentPeriodEndUtc: "2026-11-12T09:00:00Z",
      resourceSeeds: [
        { key: "students", included: 1200, used: 0 }, // used = live portal total
        { key: "branches", included: 3, used: 0 }, // used = live branch count
        { key: "storage", included: 100, used: 68 },
        { key: "emails", included: 10000, used: 3210 },
        { key: "automation_credits", included: 500, used: 140 },
      ],
      events: [
        event("evt-sun-3", "renewed", "2026-10-12T09:00:00Z", "Subscription renewed", 4500, "Growth v2"),
        event("evt-sun-2b", "addon_enabled", "2026-09-20T11:30:00Z", "Add-on enabled: Extra 100 GB storage", 500, "Growth v2"),
        event("evt-sun-2", "renewed", "2026-09-12T09:00:00Z", "Subscription renewed", 4500, "Growth v2"),
        event("evt-sun-1", "activated", "2026-08-12T09:00:00Z", "Subscription activated by Fluxeaze platform team", 4500, "Growth v2"),
      ],
      addons: ADDONS_SHARED.map((a) =>
        a.id === "sub-addon-storage-100" ? { ...a, status: "enabled" as const } : a,
      ),
    },
    "org-northgate": {
      id: "sub-northgate-1",
      planId: "plan-scale",
      planName: "Scale",
      planVersionId: "plan-scale-v1",
      planVersionLabel: "Scale v1",
      latestPublishedVersionLabel: "Scale v1",
      status: "active",
      priceMinor: 9900,
      currency: "USD",
      billingPeriod: "month",
      effectiveFromUtc: "2026-07-01T09:00:00Z",
      currentPeriodStartUtc: "2026-10-01T09:00:00Z",
      currentPeriodEndUtc: "2026-11-01T09:00:00Z",
      resourceSeeds: [
        { key: "students", included: 5000, used: 0 },
        { key: "branches", included: 10, used: 0 },
        { key: "storage", included: 500, used: 210 },
        { key: "emails", included: 50000, used: 18400 },
        { key: "automation_credits", included: 5000, used: 900 },
      ],
      events: [
        event("evt-ng-4", "renewed", "2026-10-01T09:00:00Z", "Subscription renewed", 9900, "Scale v1"),
        event("evt-ng-3", "renewed", "2026-09-01T09:00:00Z", "Subscription renewed", 9900, "Scale v1"),
        event("evt-ng-2", "renewed", "2026-08-01T09:00:00Z", "Subscription renewed", 9900, "Scale v1"),
        event("evt-ng-1", "activated", "2026-07-01T09:00:00Z", "Subscription activated by Fluxeaze platform team", 9900, "Scale v1"),
      ],
      addons: ADDONS_SHARED,
    },
  };
}

let subscriptions = seedSubscriptions();

/** Test helper: restores pristine subscription fixtures. */
export function __resetMockSubscriptions(): void {
  subscriptions = seedSubscriptions();
}

function materialize(orgId: string, seed: SubscriptionSeed): OrgSubscription {
  const membership = getMockMembership(orgId);
  const resources: SubscriptionResourceUsage[] = seed.resourceSeeds.map((r) => {
    const meta = RESOURCE_META[r.key] ?? { label: r.key, unit: "", isCredits: false };
    const used =
      r.key === "students"
        ? membership.activeStudentTotal
        : r.key === "branches"
          ? membership.branches.length
          : r.used;
    const usagePercent =
      r.included === null || r.included === 0
        ? null
        : Math.round((used / r.included) * 1000) / 10;
    return {
      key: r.key,
      label: meta.label,
      unit: meta.unit,
      included: r.included,
      used,
      usagePercent,
      warningLevel: warningFor(usagePercent),
      availability: "enabled" as const,
      isCredits: meta.isCredits,
    };
  });
  const { resourceSeeds, ...rest } = seed;
  void resourceSeeds; // consumed above to build `resources`
  return {
    ...rest,
    resources: [...resources, ...DEFERRED_RESOURCES.map((r) => ({ ...r }))],
    billingContactEmail: BILLING_CONTACT,
  };
}

export const mockSubscriptionApi = {
  async getOrgSubscription(orgId: string): Promise<OrgSubscription | null> {
    await delay(150);
    const membership = getMockMembership(orgId);
    // Billing access: owners and general managers only (backend decides).
    if (membership.role !== "owner" && membership.role !== "general_manager") {
      mockError(403, "BILLING_FORBIDDEN", "Only owners and managers with billing access can view the subscription.");
    }
    const seed = subscriptions[orgId];
    if (!seed) return null;
    return materialize(orgId, seed);
  },
};

/**
 * Admin quote-conversion hook (mock-internal): activates a subscription
 * for an org from an accepted quote's version snapshot. Mirrors the real
 * backend flow where conversion copies the quoted plan version verbatim.
 */
export function activateMockSubscriptionFromQuote(input: {
  organizationId: string;
  planId: string;
  planName: string;
  planVersionId: string;
  planVersionLabel: string;
  annualPriceMinor: number | null;
  allowances: { resourceKey: string; amount: number | null }[];
  addonNames: string[];
}): string {
  const now = new Date();
  const id = `sub-${input.organizationId}-${now.getTime()}`;
  const nowIso = now.toISOString();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  subscriptions[input.organizationId] = {
    id,
    planId: input.planId,
    planName: input.planName,
    planVersionId: input.planVersionId,
    planVersionLabel: input.planVersionLabel,
    latestPublishedVersionLabel: input.planVersionLabel,
    status: "active",
    priceMinor: input.annualPriceMinor,
    currency: "USD",
    billingPeriod: "year",
    effectiveFromUtc: nowIso,
    currentPeriodStartUtc: nowIso,
    currentPeriodEndUtc: periodEnd.toISOString(),
    resourceSeeds: input.allowances
      .filter((a) => RESOURCE_META[a.resourceKey])
      .map((a) => ({ key: a.resourceKey, included: a.amount, used: 0 })),
    events: [
      event(
        `evt-${id}-1`,
        "activated",
        nowIso,
        "Subscription activated from an accepted quote by the Fluxeaze platform team",
        input.annualPriceMinor,
        input.planVersionLabel,
      ),
    ],
    addons: ADDONS_SHARED.map((a) => ({
      ...a,
      status: input.addonNames.includes(a.name) ? ("enabled" as const) : a.status,
    })),
  };
  return id;
}
