import { __resetMockAdmin } from "@/api/mock/mock-admin";
import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSubscriptions } from "@/api/mock/mock-subscription";
import {
  createAddon,
  createPlanDraft,
  listAddons,
  listAuditEvents,
  listPlanMargins,
  listPlanVersions,
  listPlans,
  listQuotes,
  listSupplyPools,
  transitionAddonVersion,
  transitionPlanVersion,
  transitionQuote,
  updatePlanDraft,
} from "@/api/services/admin-catalog";
import { signIn, signOut } from "@/api/services/auth";
import { getPublishedPlans } from "@/api/services/plans";
import { getIntegrationFlags } from "@/api/services/settings";
import { getOrgSubscription } from "@/api/services/subscription";
import { beforeEach, describe, expect, it } from "vitest";

function resetAll() {
  resetAuthSession();
  __resetMockPortal();
  __resetMockAdmin();
  __resetMockSubscriptions();
}

async function asOwner() {
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
}
async function asAdmin() {
  await signIn({ email: "admin@fluxeaze.test", password: "password123" });
}

beforeEach(() => {
  resetAll();
});

describe("tenant subscription (Phase 8)", () => {
  it("shows the sold snapshot, live student usage, credits and deferred resources", async () => {
    await asOwner();
    const sub = await getOrgSubscription("org-sunrise");
    expect(sub).not.toBeNull();
    expect(sub!.planVersionLabel).toBe("Growth v2");
    expect(sub!.latestPublishedVersionLabel).toBe("Growth v3");
    expect(sub!.priceMinor).toBe(4500);
    expect(sub!.currency).toBe("USD");
    const students = sub!.resources.find((r) => r.key === "students");
    // 480 + 264 across the two Sunrise branches (same as dashboards).
    expect(students?.used).toBe(744);
    expect(students?.included).toBe(1200);
    expect(students?.usagePercent).toBe(62);
    const credits = sub!.resources.find((r) => r.key === "automation_credits");
    expect(credits?.isCredits).toBe(true);
    const whatsapp = sub!.resources.find((r) => r.key === "whatsapp_messages");
    expect(whatsapp?.availability).toBe("not_enabled");
    expect(sub!.events.some((e) => e.type === "activated")).toBe(true);
    expect(sub!.billingContactEmail).toContain("@");
  });

  it("forbids branch managers and returns null when no subscription exists", async () => {
    await asOwner();
    await expect(getOrgSubscription("org-riverdale")).rejects.toMatchObject({
      status: 403,
      code: "BILLING_FORBIDDEN",
    });
    expect(await getOrgSubscription("org-fresh")).toBeNull();
  });
});

describe("platform-admin gate", () => {
  it("rejects tenant sessions and signed-out calls", async () => {
    await expect(listPlans()).rejects.toMatchObject({ status: 401 });
    await asOwner();
    await expect(listPlans()).rejects.toMatchObject({
      status: 403,
      code: "PLATFORM_ADMIN_FORBIDDEN",
    });
  });

  it("public pricing projects ONLY published versions", async () => {
    const result = await getPublishedPlans();
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.plans.map((p) => p.name)).toEqual([
      "Starter",
      "Growth",
      "Scale",
      "Enterprise / Custom",
    ]);
    expect(result.plans.find((p) => p.name === "Growth")?.priceMinor).toBe(4900);
    expect(result.plans.find((p) => p.name === "Enterprise / Custom")?.priceMinor).toBeNull();
  });
});

describe("plan version lifecycle", () => {
  it("publishing a new version retires the old one, updates pricing, and leaves sold snapshots untouched", async () => {
    await asAdmin();
    const draft = await createPlanDraft("plan-growth", "plan-growth-v3");
    expect(draft.versionNumber).toBe(4);
    expect(draft.status).toBe("draft");

    const edited = await updatePlanDraft("plan-growth", draft.id, {
      basePriceMinor: 5500,
      billingPeriod: "month",
      isHighlighted: true,
      allowances: draft.allowances,
      entitlements: draft.entitlements,
    });
    expect(edited.basePriceMinor).toBe(5500);

    // Published versions are immutable; drafts can't skip preview/approval.
    await expect(
      updatePlanDraft("plan-growth", "plan-growth-v3", {
        basePriceMinor: 1,
        billingPeriod: "month",
        isHighlighted: false,
        allowances: [],
        entitlements: [],
      }),
    ).rejects.toMatchObject({ code: "PLAN_VERSION_NOT_DRAFT" });
    await expect(transitionPlanVersion("plan-growth", draft.id, "publish")).rejects.toMatchObject({
      code: "PLAN_VERSION_STATE_CONFLICT",
    });

    await transitionPlanVersion("plan-growth", draft.id, "preview");
    await transitionPlanVersion("plan-growth", draft.id, "approve");
    const published = await transitionPlanVersion("plan-growth", draft.id, "publish");
    expect(published.status).toBe("published");
    const versions = await listPlanVersions("plan-growth");
    expect(versions.find((v) => v.id === "plan-growth-v3")?.status).toBe("retired");

    const pricing = await getPublishedPlans();
    if (pricing.kind === "ok") {
      expect(pricing.plans.find((p) => p.name === "Growth")?.priceMinor).toBe(5500);
    }

    // The Sunrise subscription still runs on its Growth v2 snapshot.
    await signOut();
    await asOwner();
    const sub = await getOrgSubscription("org-sunrise");
    expect(sub!.planVersionLabel).toBe("Growth v2");
    expect(sub!.priceMinor).toBe(4500);
  });

  it("writes audit events for lifecycle changes", async () => {
    await asAdmin();
    const draft = await createPlanDraft("plan-starter", "plan-starter-v1");
    await transitionPlanVersion("plan-starter", draft.id, "preview");
    const events = await listAuditEvents({ entityId: draft.id });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]?.action).toBe("preview");
    const byActor = await listAuditEvents({ actorQuery: "rehman" });
    expect(byActor.length).toBeGreaterThan(0);
  });
});

describe("add-ons lifecycle", () => {
  it("creates a draft add-on and publishes it through the lifecycle", async () => {
    await asAdmin();
    const addon = await createAddon({
      name: "Extra 50 GB storage",
      description: "Smaller storage top-up.",
      resourceKey: "storage",
      priceMinor: 300,
      allowanceAmount: 50,
      linkedPlanIds: ["plan-starter"],
    });
    const v1 = addon.versions[0]!;
    expect(v1.status).toBe("draft");
    await transitionAddonVersion(addon.id, v1.id, "preview");
    await transitionAddonVersion(addon.id, v1.id, "approve");
    const after = await transitionAddonVersion(addon.id, v1.id, "publish");
    expect(after.versions.find((v) => v.id === v1.id)?.status).toBe("published");
    const all = await listAddons();
    expect(all.some((a) => a.name === "Extra 50 GB storage")).toBe(true);
  });
});

describe("enterprise quotes", () => {
  it("converting an accepted quote activates the org on the quoted snapshot", async () => {
    await asAdmin();
    await expect(transitionQuote("quote-1042", "reject")).rejects.toMatchObject({
      code: "QUOTE_STATE_CONFLICT",
    });
    const converted = await transitionQuote("quote-1042", "convert");
    expect(converted.status).toBe("converted");
    expect(converted.convertedSubscriptionId).toBeTruthy();
    const quotes = await listQuotes();
    expect(quotes.find((q) => q.id === "quote-1042")?.status).toBe("converted");

    await signOut();
    await asOwner();
    const sub = await getOrgSubscription("org-fresh");
    expect(sub).not.toBeNull();
    expect(sub!.planVersionLabel).toBe("Growth v3");
    expect(sub!.priceMinor).toBe(29400);
    expect(sub!.billingPeriod).toBe("year");
    expect(sub!.addons.find((a) => a.name === "Extra 100 GB storage")?.status).toBe("enabled");
  });
});

describe("supply & margins", () => {
  it("flags pools and margins at risk, admin-side only", async () => {
    await asAdmin();
    const pools = await listSupplyPools();
    expect(pools.find((p) => p.id === "pool-students-pk")?.warningLevel).toBe("critical");
    expect(pools.find((p) => p.id === "pool-storage")?.warningLevel).toBe("ok");
    const margins = await listPlanMargins();
    const starter = margins.find((m) => m.versionId === "plan-starter-v1");
    expect(starter?.warningLevel).toBe("warning");
    expect(starter?.marginPercent).toBe(13.2);
    expect(margins.find((m) => m.versionId === "plan-enterprise-v1")?.marginPercent).toBeNull();
  });
});

describe("deferred integrations", () => {
  it("never reports a deferred integration as enabled", async () => {
    await asOwner();
    const flags = await getIntegrationFlags("org-sunrise");
    expect(flags.length).toBeGreaterThanOrEqual(6);
    expect(flags.every((f) => f.status !== "enabled")).toBe(true);
    expect(flags.find((f) => f.key === "whatsapp")?.status).toBe("not_enabled");
    expect(flags.find((f) => f.key === "subscription_gateway")?.status).toBe("not_enabled");
  });
});
