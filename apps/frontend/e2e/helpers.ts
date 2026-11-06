import { expect, type Page } from "@playwright/test";

/** Signs in against the dev mock transport and (optionally) picks an org. */
export async function signInAs(
  page: Page,
  email = "owner@demo.fluxeaze.test",
  orgName?: string,
): Promise<void> {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Normal path lands on the org chooser; tolerate a direct portal landing
  // (already-selected org) and correct the org via the switcher if needed.
  // Pathname-based wait: "?next=/portal" must not false-match.
  await page.waitForURL(
    (url) => url.pathname.startsWith("/auth/organizations") || url.pathname.startsWith("/portal"),
    { timeout: 20_000 },
  );
  if (!orgName) return;
  if (new URL(page.url()).pathname.startsWith("/auth/organizations")) {
    await page.getByRole("button", { name: new RegExp(orgName) }).click();
    await expect(page).toHaveURL(/\/portal/);
  } else {
    const switcher = page.getByLabel("Switch organization");
    await expect(switcher).toBeVisible({ timeout: 15_000 });
    const current = await switcher.evaluate(
      (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? "",
    );
    if (!current.includes(orgName)) {
      await switcher.selectOption({ label: orgName });
    }
    await expect(page).toHaveURL(/\/portal/);
  }
}
