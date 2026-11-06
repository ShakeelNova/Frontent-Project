import { mockSubscriptionApi } from "@/api/mock/mock-subscription";
import { contractUnavailable, getApiTransport } from "@/api/transport";
import type { WarningLevel } from "./admin-catalog";

/**
 * Tenant subscription seam (Phase 8). Assumed endpoint (CR-010):
 *   GET /organizations/{orgId}/subscription
 *     → the org's subscription snapshot, or null when none exists yet.
 *     Restricted to owners/managers with billing access (backend 403
 *     `BILLING_FORBIDDEN` otherwise).
 *
 * HARD RULES:
 * - There is NO self-serve checkout in the pilot: plan changes and add-on
 *   activation are performed by Fluxeaze platform admins. This view is
 *   read-only and must never render a fake "pay" affordance.
 * - Money is API minor units + currency (USD catalogue). Internal credits
 *   are metered units (`isCredits`) — never formatted as money.
 * - A subscription runs on an immutable plan-version SNAPSHOT
 *   (`planVersionLabel`). Newer published versions are informational
 *   only and are never silently applied.
 * - This DTO deliberately contains NO provider costs, rates or margins —
 *   those are platform-internal and live behind the admin seam.
 */

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  cancelled: "Cancelled",
};

export interface SubscriptionResourceUsage {
  key: string;
  label: string;
  unit: string;
  /** Null = custom/unlimited. */
  included: number | null;
  used: number;
  /** Backend-computed; null when the allowance is custom/unlimited. */
  usagePercent: number | null;
  warningLevel: WarningLevel;
  /** Deferred integrations report `not_enabled` truthfully. */
  availability: "enabled" | "not_enabled";
  /** Internal metered units — label as credits, never as currency. */
  isCredits: boolean;
}

export interface SubscriptionEvent {
  id: string;
  type: "activated" | "renewed" | "plan_changed" | "addon_enabled";
  occurredAtUtc: string;
  description: string;
  amountMinor: number | null;
  currency: string;
  /** Version snapshot in force for this event. */
  planVersionLabel: string;
}

export interface SubscriptionAddon {
  id: string;
  name: string;
  description: string;
  /** e.g. "+100 GB storage" — units always explicit. */
  allowanceLabel: string;
  priceMinor: number | null;
  currency: string;
  billingPeriod: "month" | "year";
  status: "enabled" | "available";
}

export interface OrgSubscription {
  id: string;
  planId: string;
  planName: string;
  planVersionId: string;
  /** Immutable snapshot reference, e.g. "Growth v2". */
  planVersionLabel: string;
  /** Latest published version of the plan (informational only). */
  latestPublishedVersionLabel: string | null;
  status: SubscriptionStatus;
  priceMinor: number | null;
  currency: string;
  billingPeriod: "month" | "year";
  effectiveFromUtc: string;
  currentPeriodStartUtc: string;
  currentPeriodEndUtc: string;
  resources: SubscriptionResourceUsage[];
  events: SubscriptionEvent[];
  addons: SubscriptionAddon[];
  /** Pilot plan changes are admin-managed — API provides the contact. */
  billingContactEmail: string;
}

const FEATURE = "Subscription";

export async function getOrgSubscription(
  organizationId: string,
): Promise<OrgSubscription | null> {
  if (getApiTransport() === "mock") return mockSubscriptionApi.getOrgSubscription(organizationId);
  return contractUnavailable(FEATURE);
}
