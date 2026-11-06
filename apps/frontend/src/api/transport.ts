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

export function getApiTransport(): ApiTransport {
  return process.env.NEXT_PUBLIC_API_TRANSPORT === "mock" ? "mock" : "contract";
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
