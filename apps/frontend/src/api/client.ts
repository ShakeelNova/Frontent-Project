import createClient, { type Client } from "openapi-fetch";

import type { paths } from "./generated";
import { getApiBaseUrl } from "@/lib/env";

/**
 * Central API client — the ONLY way frontend code talks to the backend.
 *
 * Rules enforced here (see BACKEND_INTEGRATION_REPORT.md):
 * - Types come from the generated OpenAPI client (`./generated`, produced by
 *   `npm run api:types` from packages/api-contract/openapi.yaml). Endpoints
 *   and response shapes are never hand-written.
 * - Base URL comes from NEXT_PUBLIC_API_BASE_URL (validated in `@/lib/env`).
 * - Every request sends `credentials: "include"` so the backend's HttpOnly
 *   session cookie flows. Tokens are NEVER stored in local/session storage.
 * - Tenant scope headers (X-Organization-Id / X-Branch-Id) are attached only
 *   after an organization/branch is selected. They are scoping hints, not
 *   security — the backend authorizes every operation.
 * - CSRF: once the canonical contract documents the token endpoint/header,
 *   a token provider can be registered below; tokens are kept in memory
 *   only and attached to unsafe methods (POST/PUT/PATCH/DELETE).
 */

export interface TenantContext {
  organizationId?: string;
  branchId?: string;
}

let tenantContext: TenantContext = {};
let csrfTokenProvider: (() => string | null | undefined) | null = null;

/** Called after the user selects an organization (and optionally a branch). */
export function setTenantContext(context: TenantContext): void {
  tenantContext = { ...context };
}

export function getTenantContext(): Readonly<TenantContext> {
  return tenantContext;
}

export function clearTenantContext(): void {
  tenantContext = {};
}

/**
 * Registers an in-memory CSRF token provider (e.g. a token fetched from the
 * contract-documented CSRF endpoint and held in React state/ref). Pass null
 * to unregister. Never persist the token to web storage.
 */
export function setCsrfTokenProvider(
  provider: (() => string | null | undefined) | null,
): void {
  csrfTokenProvider = provider;
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Builds the per-request headers contributed by tenant scope + CSRF. */
export function buildScopedHeaders(method: string): Headers {
  const headers = new Headers();
  if (tenantContext.organizationId) {
    headers.set("X-Organization-Id", tenantContext.organizationId);
  }
  if (tenantContext.branchId) {
    headers.set("X-Branch-Id", tenantContext.branchId);
  }
  if (UNSAFE_METHODS.has(method.toUpperCase())) {
    const token = csrfTokenProvider?.();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }
  return headers;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Fetch wrapper used by the generated client: forces `credentials: "include"`
 * and merges scoped headers without clobbering caller headers.
 * Exported for unit testing.
 */
export function createApiFetch(baseFetch: FetchLike = globalThis.fetch): FetchLike {
  return (input, init) => {
    const method =
      init?.method ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.method
        : "GET");
    const headers = new Headers(init?.headers);
    for (const [name, value] of buildScopedHeaders(method)) {
      if (!headers.has(name)) {
        headers.set(name, value);
      }
    }
    return baseFetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  };
}

/** Validated base URL the shared client is (or will be) configured with. */
export function getApiClientBaseUrl(): string {
  return getApiBaseUrl();
}

export function createApiClient(baseFetch?: FetchLike): Client<paths> {
  return createClient<paths>({
    baseUrl: getApiBaseUrl(),
    credentials: "include",
    fetch: createApiFetch(baseFetch),
  });
}

let sharedClient: Client<paths> | null = null;

/**
 * Lazily-created shared client. Lazy so importing this module (e.g. in tests
 * or during prerender) does not throw before env is configured.
 */
export function apiClient(): Client<paths> {
  sharedClient ??= createApiClient();
  return sharedClient;
}
