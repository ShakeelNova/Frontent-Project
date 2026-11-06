import { signInAs } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 7 E2E (dev mock transport): fees (structure → generate → pay →
 * receipt, reports), student/parent portal scoping, imports wizard,
 * settings (roles/security), contextual help.
 */

test.setTimeout(90_000);

async function navTo(page: Page, label: string) {
  await page.locator("aside").getByRole("link", { name: label, exact: true }).click();
}

test("fees: generate vouchers, record a manual payment, honest receipt", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Fees");
  await expect(page.getByRole("heading", { name: "Collections & outstanding" })).toBeVisible();
  await expect(page.getByText(/no online payment gateway/i)).toBeVisible();

  await page.getByRole("link", { name: "Fee structures" }).click();
  const matricCard = page.locator("li", { hasText: "Matric" }).first();
  await matricCard.getByRole("button", { name: "Generate vouchers" }).click();
  const genDialog = page.getByRole("dialog");
  await genDialog.getByLabel(/Period label/).fill("Nov 2026");
  await genDialog.getByLabel(/Due date/).fill("2026-11-10");
  await genDialog.getByRole("button", { name: "Generate vouchers" }).click();
  await expect(page).toHaveURL(/\/portal\/fees\/vouchers/);

  await page.getByLabel("Search student, code or voucher №").fill("Ayesha Khan");
  const row = page.getByRole("row", { name: /Ayesha Khan.*Nov 2026/ });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /View voucher/ }).click();

  await expect(page.getByText("Breakdown")).toBeVisible();
  await page.getByRole("button", { name: "Record payment" }).click();
  const payDialog = page.getByRole("dialog");
  await payDialog.getByLabel(/Amount \(PKR\)/).fill("5000");
  // Financial-action confirmation: review step before anything records.
  await payDialog.getByRole("button", { name: "Review payment" }).click();
  await expect(payDialog.getByText("Please confirm before recording")).toBeVisible();
  await payDialog.getByRole("button", { name: "Confirm payment" }).click();

  const receipt = page.getByRole("dialog");
  await expect(receipt.getByText("Manually recorded payment")).toBeVisible();
  await expect(receipt.getByText(/not a bank or payment-gateway confirmation/i)).toBeVisible();
  await receipt.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("PKR 11,000").first()).toBeVisible();
});

test("guardian: lands in student area, sees only linked students", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email/).fill("guardian@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student/, { timeout: 15_000 });

  await expect(page.getByRole("heading", { name: /Ayesha Khan/ })).toBeVisible();
  // No management navigation in this area.
  await expect(page.getByRole("link", { name: "Students", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Staff", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Fees", exact: true }).click();
  await expect(page.getByText(/Online payment isn.t available yet/)).toBeVisible();
  await expect(page.getByText(/VCH-2026-/).first()).toBeVisible();

  await page.getByRole("link", { name: "Results" }).click();
  await expect(page.getByRole("cell", { name: "Mathematics" })).toBeVisible();

  // Switch to the second linked student → results not published yet.
  await page.getByLabel("Switch student").selectOption({ index: 1 });
  await expect(page.getByText("Results not yet available")).toBeVisible();

  // The org portal refuses guardian sessions with a friendly panel.
  await page.goto("/portal");
  await page.getByLabel(/^Email/).fill("guardian@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "This area is for school staff" })).toBeVisible({
    timeout: 15_000,
  });
});

test("imports: students CSV goes upload → map → validate → commit", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Imports");
  await page.getByRole("link", { name: /Start students import/ }).click();

  const csv = [
    "Full Name,Date of Birth,Gender,Email,Phone,Branch,Student Code",
    "Import One,2013-03-02,Male,,,Main campus,",
    "Import Two,2012-07-09,Female,,,North campus,",
    "Bad Branch,2013-01-01,Male,,,Nowhere campus,",
  ].join("\n");
  await page.locator('input[type="file"]').setInputFiles({
    name: "students.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(/3 data row\(s\)/).first()).toBeVisible();

  await page.getByRole("button", { name: "Save mapping" }).click();
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByText("Errors · 1")).toBeVisible();
  await expect(page.getByText(/Unknown branch/)).toBeVisible();

  await page.getByRole("button", { name: "Confirm & Import" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm & Import" })
    .click();
  await expect(page.getByText("Import complete")).toBeVisible();
  await expect(page.getByText(/2 record\(s\) imported/)).toBeVisible();

  await navTo(page, "Students");
  await page.getByLabel("Search by name or student ID").fill("Import One");
  await expect(page.getByRole("row", { name: /Import One/ })).toBeVisible();
});

test("settings: role permissions save; wrong current password is a field error", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await navTo(page, "Settings");

  await page.getByRole("link", { name: "Roles & permissions" }).click();
  await page.getByLabel("Role", { exact: true }).selectOption("teacher");
  await page.getByLabel("View vouchers & reports").check();
  await page.getByRole("button", { name: "Save permissions" }).click();
  await expect(page.getByText("Teacher permissions saved")).toBeVisible();

  await page.getByLabel("Role", { exact: true }).selectOption("owner");
  await expect(page.getByText("System role — locked by the backend")).toBeVisible();

  await page.getByRole("link", { name: "Security" }).click();
  await page.getByLabel("Current password").fill("incorrect123");
  await page.getByLabel(/^New password/).fill("newpass12345");
  await page.getByLabel("Confirm new password").fill("newpass12345");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Current password is incorrect.")).toBeVisible();
  await expect(page.getByText("This device")).toBeVisible();
});

test("help: contextual article opens for the dashboard", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page.getByRole("button", { name: "Help: Dashboard" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Reading your dashboard")).toBeVisible();
  await expect(dialog.getByText(/Capacity warnings appear at 80%/)).toBeVisible();
});
