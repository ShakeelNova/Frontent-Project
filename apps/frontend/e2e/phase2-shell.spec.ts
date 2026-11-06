import { signInAs } from "./helpers";
import { expect, test } from "@playwright/test";

/**
 * Phase 2 E2E (updated Phase 4): the portal is now authenticated — the
 * footer link lands signed-out visitors on sign-in (guard), while the
 * student/admin placeholders remain. Drawer test signs in first.
 */

test("route group placeholders remain navigable from the public footer", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Education Operations OS/i }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Portal", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);

  await page.goto("/student");
  // Phase 7: the student/parent area is real — signed-out visitors get a
  // sign-in prompt, never student data.
  await expect(
    page.getByRole("heading", { name: "Sign in to view your student area" }),
  ).toBeVisible();

  await page.goto("/admin");
  // Phase 8: the platform-admin area is real and gated — signed-out
  // visitors are bounced to sign-in with a return target.
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin/);
});

test("portal shell: honest nav badges, mobile drawer opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");

  await expect(page.getByTestId("portal-mobile-nav")).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByTestId("portal-mobile-nav");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Students")).toBeVisible();
  // Phase 8: every tenant module has shipped — no "Soon" badges remain.
  await expect(drawer.getByText("Soon")).toHaveCount(0);
  await expect(drawer.getByText("Billing & subscription")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("portal-mobile-nav")).toHaveCount(0);
});

test("design system: dialog traps/dismisses and toasts announce", async ({ page }) => {
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();

  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Example dialog" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "success toast" }).click();
  await expect(
    page.getByRole("status", { name: "Notifications" }).getByText("Success toast"),
  ).toBeVisible();
});

test("theme toggle switches to dark and persists across reload", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Switch to (dark|light) theme/ }).first();
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await toggle.click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe(after);
});
