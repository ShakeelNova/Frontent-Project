import { getMockPublishedPlans } from "@/api/mock/mock-admin";
import { getApiTransport } from "@/api/transport";

/**
 * Frontend view models for published plans. When the canonical contract
 * publishes its public plans endpoint, map generated types → these models
 * in the `contract` branch below; rendering code never changes.
 * Prices are ALWAYS API values (minor units + currency) — never hardcoded.
 */
export interface PlanAllowance {
  label: string;
  /** Null = unlimited/custom (rendered as “Custom”, never a guessed number). */
  amount: number | null;
  /** Display unit from the API, e.g. "students", "GB", "emails / month", "credits / month". */
  unit: string;
}

export interface PublishedPlan {
  id: string;
  name: string;
  tagline?: string;
  /** Null = custom pricing (e.g. Enterprise) — UI says “Custom pricing”. */
  priceMinor: number | null;
  currency: string;
  billingPeriod?: "month" | "year";
  highlight?: boolean;
  allowances: PlanAllowance[];
}

export type PublishedPlansResult =
  | { kind: "ok"; plans: PublishedPlan[] }
  | { kind: "unavailable" };

/**
 * Fetches published plans only.
 * - contract transport: no endpoint exists in the current (placeholder)
 *   contract → returns "unavailable" so Pricing shows its spec'd empty
 *   state (“Plans are being prepared…”). No prices are ever fabricated.
 * - mock transport (dev/test): deterministic fixtures.
 */
export async function getPublishedPlans(): Promise<PublishedPlansResult> {
  if (getApiTransport() === "mock") {
    // The dev mock projects the platform-admin catalogue: only PUBLISHED
    // versions, public fields only — publish in /admin and /pricing
    // follows. Drafts and internal costs never leave the admin surface.
    return { kind: "ok", plans: await getMockPublishedPlans() };
  }
  // TODO(contract): call apiClient().GET(<public plans path>) and map.
  return { kind: "unavailable" };
}
