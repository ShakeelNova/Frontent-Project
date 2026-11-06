import { expect, test } from "@playwright/test";

/**
 * App-shell smoke test (updated Phase 3): the real marketing landing
 * renders inside the (public) layout with primary CTAs.
 */
test("home page renders the Fluxeaze landing page", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Education Operations OS for multi-branch institutes/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a pilot" }).first()).toBeVisible();
  await expect(page.getByText(/not live features —/i)).toBeVisible();
});
