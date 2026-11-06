import { signInAs } from "./helpers";
import { expect, test } from "@playwright/test";

/**
 * Phase 3 E2E (dev mock transport — see playwright.config webServer.env):
 * pricing from the (mock) published-plans service, pilot submission,
 * sign-in/session bootstrap, unverified handling, invite + verify flows.
 * The same specs rerun against the real backend once the canonical
 * contract lands (transport flips, pages unchanged).
 */

test("pricing lists published plans with formatted prices", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
  await expect(page.getByText("$19.00")).toBeVisible();
  await expect(page.getByText("Custom pricing")).toBeVisible();
  await expect(page.getByText("300 students")).toBeVisible();
});

test("request-pilot: valid form reaches the success panel", async ({ page }) => {
  await page.goto("/request-pilot");
  await page.getByLabel(/Organization name/).fill("Sunrise Academy");
  await page.getByLabel(/Contact person/).fill("Ayesha Khan");
  await page.getByLabel(/Work email/).fill("ayesha@sunrise-academy.test");
  await page.getByLabel(/Country/).fill("Pakistan");
  await page.getByRole("button", { name: "Request a pilot" }).click();
  await expect(
    page.getByRole("heading", { name: /Request received/i }),
  ).toBeVisible();
});

test("sign-in: demo owner picks an org, reaches the portal, can sign out (Phase 4)", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");

  await expect(page.getByText(/Demo Owner \(mock\)/)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("sign-in: unverified account gets verify-first alert with resend", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email/).fill("unverified@fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Please verify your email first")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resend verification email" }),
  ).toBeVisible();
});

test("invite: pending shows no password setup; ready invite completes", async ({ page }) => {
  await page.goto("/invite/pending-token");
  await expect(page.getByText("Your invitation is being reviewed")).toBeVisible();
  await expect(page.getByLabel(/Set your password/)).toHaveCount(0);

  await page.goto("/invite/ready-token");
  await page.getByLabel(/Your full name/).fill("Invited Teacher");
  await page.getByLabel(/Set your password/).fill("password123");
  await page.getByLabel(/Confirm password/).fill("password123");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("verify-email + reset-password token states render correctly", async ({ page }) => {
  await page.goto("/auth/verify-email?token=demo-token");
  await expect(page.getByText("Email verified")).toBeVisible();

  await page.goto("/auth/reset-password?token=expired-token");
  await page.getByLabel(/^New password/).fill("password123");
  await page.getByLabel(/Confirm new password/).fill("password123");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("This reset link has expired")).toBeVisible();
});
