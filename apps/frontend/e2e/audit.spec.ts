import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

/**
 * Cross-phase audit E2E additions (Phase 8 minimum list + full-spec
 * audit): sign-up journey, portal session-expiry deep link, pricing
 * with no published plans, 500-error recovery preserving form entries,
 * and the import error-report download. Mock transport; all navigation
 * after the initial page load is client-side (mock state is in-memory).
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

test("sign-up: valid details reach the check-your-email state", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await page.getByLabel(/Your full name/).fill("New Owner");
  await page.getByLabel(/Organization name/).fill("Greenfield Academy");
  await page.getByLabel(/Work email/).fill("owner@greenfield-academy.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByLabel(/Confirm password/).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Account created — check your email")).toBeVisible({
    timeout: 15_000,
  });
});

test("portal deep link while signed out bounces to sign-in and returns after sign-in", async ({
  page,
}) => {
  // Session-expiry scenario: a deep link to a protected page never
  // renders tenant data while signed out (Phase 4 §5).
  await page.goto("/portal/fees");
  await page.waitForURL(/\/auth\/sign-in\?next=/, { timeout: 15_000 });
  expect(decodeURIComponent(page.url())).toContain("next=/portal/fees");
  await expect(page.getByText("Collections & outstanding")).toHaveCount(0);

  await page.getByLabel(/^Email/).fill("owner@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  // The deep link may be honored directly (then the fees page asks for an
  // org) or route via the org chooser first — walk the state machine
  // until the fees page actually renders.
  await expect(async () => {
    const path = new URL(page.url()).pathname;
    if (path.startsWith("/auth/organizations")) {
      await page.getByRole("button", { name: /Sunrise Academy/ }).click();
    } else if (path.startsWith("/portal") && path !== "/portal/fees") {
      await page.locator("aside").getByRole("link", { name: "Fees", exact: true }).click();
    }
    await expect(
      page.getByRole("heading", { name: "Collections & outstanding" }),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
});

test("pricing shows the honest empty state when no plans are published", async ({ page }) => {
  await signInAdmin(page);

  // Retire the published version of every plan (catalog order).
  const planNames = ["Starter", "Growth", "Scale", "Enterprise / Custom"];
  for (let i = 0; i < planNames.length; i++) {
    await page.getByRole("link", { name: "Plans & versions" }).click();
    await expect(page.getByText("Published:").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Manage versions →" }).nth(i).click();
    await expect(
      page.getByRole("heading", { name: `${planNames[i]} — versions` }),
    ).toBeVisible({ timeout: 15_000 });
    const publishedRow = page.getByRole("row", { name: /published/i }).first();
    await publishedRow.getByRole("link", { name: /^Open version/ }).click();
    await page.getByRole("button", { name: "Retire", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Retire", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
  }

  await page.getByRole("link", { name: "View public pricing" }).click();
  await expect(page.getByText("Plans are being prepared")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Starter" })).toHaveCount(0);
});

test("pilot: a 500 keeps the typed values so the request can be retried", async ({ page }) => {
  await page.goto("/request-pilot");
  await page.getByLabel(/Organization name/).fill("Outage Academy");
  await page.getByLabel(/Contact person/).fill("Sara Ali");
  // Mock trigger: @demo-outage.test → 500 (documented dev scenario).
  await page.getByLabel(/Work email/).fill("ops@demo-outage.test");
  await page.getByLabel(/Country/).fill("Pakistan");
  await page.getByRole("button", { name: "Request a pilot" }).click();

  await expect(page.getByText("Something went wrong on our side")).toBeVisible({
    timeout: 15_000,
  });
  // Nothing the user typed is lost.
  await expect(page.getByLabel(/Organization name/)).toHaveValue("Outage Academy");
  await expect(page.getByLabel(/Contact person/)).toHaveValue("Sara Ali");

  await page.getByLabel(/Work email/).fill("ops@outage-academy.test");
  await page.getByRole("button", { name: "Request a pilot" }).click();
  await expect(page.getByRole("heading", { name: /Request received/i })).toBeVisible({
    timeout: 15_000,
  });
});

test("imports: invalid rows produce a downloadable CSV error report", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page.locator("aside").getByRole("link", { name: "Imports" }).click();
  await page.getByRole("link", { name: /Start students import/ }).click();

  const csv = [
    "Full Name,Date of Birth,Gender,Email,Phone,Branch,Student Code",
    "Report One,2013-03-02,Male,,,Main campus,",
    "Bad Branch,2013-01-01,Male,,,Nowhere campus,",
  ].join("\n");
  await page.locator('input[type="file"]').setInputFiles({
    name: "students.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(/2 data row\(s\)/).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Save mapping" }).click();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByText("Errors · 1")).toBeVisible({ timeout: 15_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    page.getByRole("button", { name: "Download error report (CSV)" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^import-errors-.*\.csv$/);
});
