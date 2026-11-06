import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config (Phase 1: app-shell smoke test only).
 * Feature E2E suites (auth, students, attendance, fees, …) land in later
 * phases once the canonical API contract is published.
 *
 * Install browsers once per machine:  npx playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // E2E exercises Phase 3 flows against the deterministic DEV mock
      // transport until the canonical contract/backend land. Never do this
      // for a production deployment (see BACKEND_INTEGRATION_REPORT.md).
      NEXT_PUBLIC_API_TRANSPORT: "mock",
    },
  },
});
