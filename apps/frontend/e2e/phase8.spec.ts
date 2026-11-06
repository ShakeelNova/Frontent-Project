import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

/**
 * Phase 8 E2E (mock transport): tenant billing snapshot + no fake
 * checkout, billing restricted for branch managers, the platform-admin
 * plan lifecycle flowing into public pricing, quote conversion creating
 * a tenant subscription, and tenant sessions blocked from /admin.
 * All navigation is client-side (dev-mock state lives in page memory).
 */

test.setTimeout(120_000);

async function signInAdmin(page: Page) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email/).fill("admin@fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible({
    timeout: 15_000,
  });
}

test("tenant billing: snapshot, usage, pilot message, no checkout; BM restricted", async ({
  page,
}) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page
    .locator("aside")
    .getByRole("link", { name: "Billing & subscription" })
    .click();
  await expect(page.getByRole("heading", { name: "Billing & subscription" })).toBeVisible({
    timeout: 15_000,
  });

  // Sold snapshot (Growth v2) vs newer published version (v3).
  await expect(page.getByText("Growth v2").first()).toBeVisible();
  await expect(page.getByText(/newer version/i).first()).toBeVisible();
  await expect(page.getByText("744 students")).toBeVisible();
  await expect(page.getByText("$45.00 / month")).toBeVisible();
  await expect(
    page.getByText(/managed by Fluxeaze platform admins/i).first(),
  ).toBeVisible();
  await expect(page.getByText("Not enabled").first()).toBeVisible(); // WhatsApp row

  // No fake checkout anywhere, and no internal cost data tenant-side.
  await expect(page.getByRole("button", { name: /pay|checkout|upgrade|buy/i })).toHaveCount(0);
  await expect(page.getByText(/margin/i)).toHaveCount(0);

  // Branch-manager org: backend 403 → friendly restricted state.
  await page.getByLabel("Switch organization").selectOption({ label: "Riverdale Coaching" });
  await expect(page.getByText("Billing is restricted")).toBeVisible({ timeout: 15_000 });
});

test("admin lifecycle: clone → edit → preview → approve → publish → pricing updates", async ({
  page,
}) => {
  await signInAdmin(page);

  // Internal cost data exists here (and only here).
  await page.getByRole("link", { name: "Resources & rates" }).click();
  await expect(page.getByText("Internal cost data")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("per active student / month")).toBeVisible();

  await page.getByRole("link", { name: "Plans & versions" }).click();
  await expect(page.getByText("Published: Growth v3")).toBeVisible({ timeout: 15_000 });
  // Growth card → manage versions (second card).
  await page.getByRole("link", { name: "Manage versions →" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Growth — versions" })).toBeVisible({
    timeout: 15_000,
  });

  const v3Row = page.getByRole("row", { name: /v3/ }).first();
  await v3Row.getByRole("button", { name: "Clone to draft" }).click();
  await expect(page.getByRole("heading", { name: "Growth v4" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel(/^Base price/).fill("59");
  await page.getByRole("button", { name: "Save draft" }).click();
  // The form remounts with server state after save — the price round-trips
  // as 59.00 (more reliable than racing the success toast).
  await expect(page.getByLabel(/^Base price/)).toHaveValue("59.00", { timeout: 20_000 });

  const confirm = async (label: string) => {
    await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
  };

  await page.getByRole("button", { name: "Move to preview" }).click();
  await confirm("Move to preview");
  await expect(page.getByText("In preview").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Impact vs published/)).toBeVisible();

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await confirm("Approve");
  await expect(page.getByText("Approved").first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await confirm("Publish");
  await expect(page.getByText("Immutable snapshot")).toBeVisible({ timeout: 15_000 });

  // Public pricing reflects the new published version (client-side nav).
  await page.getByRole("link", { name: "View public pricing" }).click();
  await expect(page.getByText("$59.00")).toBeVisible({ timeout: 15_000 });
});

test("quote conversion activates the tenant subscription on the quoted snapshot", async ({
  page,
}) => {
  await signInAdmin(page);
  await page.getByRole("link", { name: "Enterprise quotes" }).click();
  await expect(page.getByText("Fresh Start Institute").first()).toBeVisible({
    timeout: 15_000,
  });
  const row = page.getByRole("row", { name: /Fresh Start Institute/ });
  await row.getByRole("button", { name: "Convert to subscription" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Convert to subscription", exact: true })
    .click();
  await expect(row.getByText("Converted to subscription")).toBeVisible({ timeout: 15_000 });

  // Sign out (client-side) and in as the tenant owner — mock state persists.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/auth/sign-in"), { timeout: 15_000 });
  await page.getByLabel(/^Email/).fill("owner@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  // The admin deep-link (next=/admin/quotes) is honored, so the tenant
  // lands on the restricted panel first — route via the public site into
  // the portal (all client-side; mock state with the conversion persists).
  await expect(page.getByRole("heading", { name: "Platform admins only" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("link", { name: "Back to the public site" }).click();
  await page.getByRole("link", { name: "Portal", exact: true }).click();
  await page.getByRole("button", { name: /Fresh Start Institute/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 15_000 });

  await page
    .locator("aside")
    .getByRole("link", { name: "Billing & subscription" })
    .click();
  await expect(page.getByText("Growth v3").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("$294.00 / year")).toBeVisible();
});

test("tenant sessions are blocked from the platform-admin area", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  // Hard navigation resets the in-memory mock session → sign-in bounce
  // with next=/admin; signing back in as a tenant shows the restriction.
  await page.goto("/admin");
  await page.waitForURL(/\/auth\/sign-in\?next=/, { timeout: 15_000 });
  await page.getByLabel(/^Email/).fill("owner@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Platform admins only" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/provider rates, margins and quotes are internal/i)).toBeVisible();
});
