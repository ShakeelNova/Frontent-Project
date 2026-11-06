import { signInAs } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 6 E2E (dev mock transport): staff directory + approvals + role
 * protection, student batch marking, QR session + duplicate detection,
 * backend staff flags, request decisions, honest device statuses.
 */

// Dev-mode Turbopack compiles many new portal routes on first hit.
test.setTimeout(90_000);

async function navTo(page: Page, label: string) {
  await page.locator("aside").getByRole("link", { name: label, exact: true }).click();
}

test("staff directory: badges, pending approval, approve flow", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Staff");
  await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();

  await page.getByLabel("Search by name, email or staff ID").fill("Talha");
  const row = page.getByRole("row", { name: /Talha Rind/ });
  await expect(row.getByText("Pending approval")).toBeVisible();
  await row.getByRole("link", { name: "View Talha Rind" }).click();

  await expect(page.getByText("Pending approval").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Approve staff" }).click();
  await expect(page.getByText("Pending approval")).toHaveCount(0);
  await expect(page.getByText("Attendance summary").first()).toBeVisible();
});

test("invite staff creates an invited record", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Staff");
  await page.getByRole("button", { name: "Invite staff" }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Full name/).fill("Probe Person");
  await dialog.getByLabel(/^Work email/).fill("probe.person@inbox.test");
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(dialog).toBeHidden();

  await page.getByLabel("Search by name, email or staff ID").fill("Probe Person");
  await expect(page.getByRole("row", { name: /Probe Person/ }).getByText("Invited")).toBeVisible();
});

test("last owner role removal is blocked with helpful copy", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Staff");
  await page.getByLabel("Search by name, email or staff ID").fill("Demo Owner");
  // Wait for the debounced search + refetch to settle before clicking.
  await expect(page.getByText(/· 1 total/)).toBeVisible();
  await page.getByRole("link", { name: "View Demo Owner" }).click();
  await expect(page).toHaveURL(/\/portal\/staff\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "Remove Owner role" }).click();
  await page.getByRole("button", { name: "Remove role" }).click();
  await expect(page.getByText("Can't remove the last owner")).toBeVisible();
});

test("student attendance: mark all present + save", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Attendance");
  await expect(page.getByRole("heading", { name: "Daily student attendance" })).toBeVisible();

  await page.getByRole("button", { name: "Mark all present" }).click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText("Attendance saved")).toBeVisible();
  await expect(page.getByText("Unmarked · 0")).toBeVisible();
});

test("QR session: check-in works and duplicates are caught", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Attendance");
  await page.getByRole("link", { name: "QR check-in" }).click();

  await page.getByLabel("Class / batch").selectOption({ label: "Grade 10-A · Matric Science" });
  await page.getByRole("button", { name: "Start QR session" }).click();
  await expect(page.getByText(/FLX-/).first()).toBeVisible();

  await page.getByLabel("Student code (scan or type)").fill("SUN-1001");
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Ayesha Khan").first()).toBeVisible();

  await page.getByLabel("Student code (scan or type)").fill("SUN-1001");
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Already checked in", { exact: true })).toBeVisible();
});

test("staff attendance shows backend late/missing flags", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Attendance");
  await page.getByRole("link", { name: "Staff attendance" }).click();

  await expect(page.getByRole("heading", { name: "Staff attendance" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Late by 25 min/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Missing check-out/ }).first()).toBeVisible();
});

test("requests: seeded correction can be approved", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Attendance");
  await page.getByRole("link", { name: "Corrections & leave" }).click();

  await expect(page.getByText("Pending").first()).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).first().click();
  await page.getByRole("button", { name: "Approve correction" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();
});

test("devices: K50 is honest and new registrations start unconfigured", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Devices");
  await expect(page).toHaveURL(/\/portal\/devices/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText("Attendance works without devices")).toBeVisible();
  const k50 = page.locator("li", { hasText: "K50" }).first();
  await expect(k50.getByText(/Pending verification|Not configured/).first()).toBeVisible();
  await expect(k50.getByText("Verified", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Register device" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Device name/).fill("Probe gate tablet");
  await dialog.getByRole("button", { name: "Register device" }).click();
  const card = page.locator("li", { hasText: "Probe gate tablet" });
  await expect(card.getByText("Not configured")).toBeVisible();
  await expect(card.getByText("Never seen")).toBeVisible();
});
