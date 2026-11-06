import { signInAs } from "./helpers";
import { expect, test } from "@playwright/test";

/**
 * Phase 4 E2E (dev mock transport): portal guard, org chooser (0/many),
 * tenant switching, org + branch dashboards, capacity warnings, role-aware
 * navigation, setup checklist progress. Backend remains the authority —
 * the BM org-dashboard 403 + fallback is asserted end-to-end.
 */

test("unauthenticated portal visit redirects to sign-in with a next path", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
});

test("no-org user sees the contact-admin message", async ({ page }) => {
  await signInAs(page, "noorg@fluxeaze.test");
  await expect(page.getByText("No organizations assigned yet")).toBeVisible();
});

test("org chooser lists organizations with roles; owner lands on the org dashboard", async ({ page }) => {
  await signInAs(page);
  await expect(page.getByRole("button", { name: /Sunrise Academy/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Northgate College/ })).toBeVisible();
  await page.getByRole("button", { name: /Sunrise Academy/ }).click();

  await expect(page).toHaveURL(/\/portal/);
  await expect(page.getByRole("heading", { name: /Sunrise Academy dashboard/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Active students: 744/ })).toBeVisible();
  // 62% capacity → no capacity banner yet
  await expect(page.getByText(/capacity above 80%/i)).toHaveCount(0);
  // branch comparison present
  await expect(page.getByRole("heading", { name: "Branch comparison" })).toBeVisible();
});

test("switching org in the top bar refetches + shows the 85% capacity warning", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page.getByLabel("Switch organization").selectOption({ label: "Northgate College" });

  await expect(page.getByRole("heading", { name: /Northgate College dashboard/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Active students: 1,700/ })).toBeVisible();
  await expect(page.getByText(/Student capacity above 80% — 85% used/)).toBeVisible();

  // date range preset changes the URL (server-driven refetch key)
  await page.getByRole("button", { name: "Last 30 days" }).click();
  await expect(page).toHaveURL(/preset=month/);
  await expect(page.getByRole("link", { name: /Active students:/ })).toBeVisible();
});

test("branch manager: org dashboard restricted, branch view shows 100% capacity guidance", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Riverdale Coaching");

  await expect(
    page.getByText("Org-wide metrics are restricted to Owners and General Managers"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Active students · Gulberg branch:/ })).toBeVisible();
  await expect(page.getByText(/Student capacity full — new enrollments blocked/)).toBeVisible();
  await expect(
    page.getByText(/Existing records, attendance and fee history remain fully accessible/),
  ).toBeVisible();

  // role-aware nav: no Settings / Imports for a branch manager
  const nav = page.locator("aside");
  await expect(nav.getByText("Settings")).toHaveCount(0);
  await expect(nav.getByText("Imports")).toHaveCount(0);
  await expect(nav.getByText("Students")).toBeVisible();
});

test("fresh org: empty dashboard + non-blocking checklist that advances after a step", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Fresh Start Institute");

  await expect(page.getByText("Nothing to report yet")).toBeVisible();
  await expect(page.getByText(/Getting started — 0 of 6 done/)).toBeVisible();

  // portal is NOT hard-blocked: complete one step via its checklist link
  await page.getByRole("link", { name: "Set preferences" }).click();
  await expect(page).toHaveURL(/\/portal\/settings\/preferences/);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved")).toBeVisible();

  // client-side navigation (the dev mock lives in page memory; a hard
  // reload would reset its fixtures — a real backend would not)
  await page.locator("aside").getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText(/Getting started — 1 of 6 done/)).toBeVisible();
});

test("drill-down lands on the real Students directory (Phase 5)", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page.getByRole("link", { name: /Active students:/ }).first().click();
  await expect(page).toHaveURL(/\/portal\/students/);
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});
