/**
 * API transport selection — the seam between UI services and the wire.
 *
 * - `contract` (default, production): calls go through the generated
 *   OpenAPI client (`apiClient()`). The canonical contract has not been
 *   published yet (zero operations), so until it lands every service call
 *   resolves via `contractUnavailable()` and the UI shows honest
 *   "not available yet" states. When the contract publishes, adapters are
 *   implemented per-service against generated types — nothing else changes.
 * - `mock` (DEV/TEST ONLY): deterministic in-memory fixtures
 *   (`src/api/mock/mock-api.ts`) so flows are clickable and E2E-testable
 *   before the backend exists. Enabled ONLY by explicitly setting
 *   NEXT_PUBLIC_API_TRANSPORT=mock; a visible banner announces it, and it
 *   must NEVER be set for a production deployment. Assumed endpoint shapes
 *   are logged as change requests in BACKEND_INTEGRATION_REPORT.md.
 */

export type ApiTransport = "contract" | "mock";

/**
 * Resolves the active transport.
 *
 * - An explicit `NEXT_PUBLIC_API_TRANSPORT` always wins (`mock` or
 *   `contract`), so CI, E2E and backend-integration work stay deterministic.
 * - With no explicit choice, the app selects `contract` when a backend base
 *   URL is configured, and falls back to the in-memory demo mock when it is
 *   not. That fallback is what makes a fresh checkout / preview usable
 *   without a backend; the visible banner and MockHint boxes make the mode
 *   unmistakable, and any real deployment sets `NEXT_PUBLIC_API_BASE_URL`
 *   (and therefore gets `contract`).
 */
export function getApiTransport(): ApiTransport {
  const configured = process.env.NEXT_PUBLIC_API_TRANSPORT?.trim().toLowerCase();
  if (configured === "mock") return "mock";
  if (configured === "contract") return "contract";

  const hasBackendBaseUrl = Boolean(
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim(),
  );
  return hasBackendBaseUrl ? "contract" : "mock";
}

export function isMockTransport(): boolean {
  return getApiTransport() === "mock";
}

/** Structured error thrown by services while the contract is unpublished. */
export function contractUnavailable(feature: string): never {
  throw {
    status: 501,
    code: "CONTRACT_NOT_PUBLISHED",
    message: `${feature} is not available yet: the canonical API contract has not been published.`,
  };
}
