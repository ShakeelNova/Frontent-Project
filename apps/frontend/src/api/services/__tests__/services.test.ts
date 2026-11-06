import { __resetMockSession } from "@/api/mock/mock-api";
import { getCurrentUser, signIn, signOut } from "@/api/services/auth";
import { getInvite } from "@/api/services/invites";
import { getPublishedPlans } from "@/api/services/plans";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => __resetMockSession());
afterEach(() => vi.unstubAllEnvs());

describe("auth service (mock transport)", () => {
  it("demo owner signs in, bootstrap reflects session, sign-out clears it", async () => {
    expect(await getCurrentUser()).toBeNull();
    const user = await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
    expect(user.email).toBe("owner@demo.fluxeaze.test");
    expect((await getCurrentUser())?.id).toBe(user.id);
    await signOut();
    expect(await getCurrentUser()).toBeNull();
  });

  it("scenario emails produce stable error codes", async () => {
    await expect(
      signIn({ email: "locked@fluxeaze.test", password: "password123" }),
    ).rejects.toMatchObject({ code: "ACCOUNT_LOCKED" });
    await expect(
      signIn({ email: "unverified@fluxeaze.test", password: "password123" }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(
      signIn({ email: "stranger@inbox.test", password: "password123" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("plans + invites services (mock transport)", () => {
  it("returns fixture plans in minor units with currency", async () => {
    const result = await getPublishedPlans();
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.plans.map((p) => p.name)).toContain("Starter");
      expect(result.plans[0]?.priceMinor).toBe(1900);
      expect(result.plans[0]?.currency).toBe("USD");
    }
  });

  it("invite token scenarios resolve/reject as documented", async () => {
    expect((await getInvite("ready-token")).status).toBe("ready");
    expect((await getInvite("pending-token")).status).toBe("pending_approval");
    await expect(getInvite("expired-token")).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
    await expect(getInvite("nope")).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("contract transport (no published contract)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_TRANSPORT", "contract"));

  it("pricing reports unavailable (never fabricated prices)", async () => {
    expect(await getPublishedPlans()).toEqual({ kind: "unavailable" });
  });

  it("auth writes reject with CONTRACT_NOT_PUBLISHED; bootstrap is signed-out", async () => {
    await expect(
      signIn({ email: "stranger@inbox.test", password: "password123" }),
    ).rejects.toMatchObject({ code: "CONTRACT_NOT_PUBLISHED" });
    expect(await getCurrentUser()).toBeNull();
  });
});
