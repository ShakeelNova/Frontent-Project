import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiClient,
  clearTenantContext,
  createApiFetch,
  getApiClientBaseUrl,
  setCsrfTokenProvider,
  setTenantContext,
} from "../client";

afterEach(() => {
  vi.unstubAllEnvs();
  clearTenantContext();
  setCsrfTokenProvider(null);
});

describe("apiClient configuration", () => {
  it("uses NEXT_PUBLIC_API_BASE_URL as its base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    expect(getApiClientBaseUrl()).toBe("http://localhost:4000/api/v1");
    expect(apiClient()).toBeDefined();
  });

  it("sends credentials:include and tenant scope headers on every request", async () => {
    setTenantContext({ organizationId: "org-123", branchId: "branch-456" });
    const baseFetch = vi.fn(async () => new Response(null, { status: 200 }));
    const apiFetch = createApiFetch(baseFetch);

    await apiFetch("http://localhost:4000/api/v1/example", { method: "GET" });

    expect(baseFetch).toHaveBeenCalledOnce();
    const [, init] = baseFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.credentials).toBe("include");
    const headers = new Headers(init.headers);
    expect(headers.get("X-Organization-Id")).toBe("org-123");
    expect(headers.get("X-Branch-Id")).toBe("branch-456");
  });

  it("omits tenant headers before an organization is selected", async () => {
    const baseFetch = vi.fn(async () => new Response(null, { status: 200 }));
    await createApiFetch(baseFetch)("http://localhost:4000/api/v1/example", {
      method: "GET",
    });
    const [, init] = baseFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has("X-Organization-Id")).toBe(false);
    expect(headers.has("X-Branch-Id")).toBe(false);
  });

  it("attaches the in-memory CSRF token only to unsafe methods", async () => {
    setCsrfTokenProvider(() => "csrf-test-token");
    const baseFetch = vi.fn(async () => new Response(null, { status: 200 }));
    const apiFetch = createApiFetch(baseFetch);

    await apiFetch("http://localhost:4000/api/v1/example", { method: "GET" });
    await apiFetch("http://localhost:4000/api/v1/example", { method: "POST" });

    const getHeaders = new Headers(
      (baseFetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers,
    );
    const postHeaders = new Headers(
      (baseFetch.mock.calls[1] as unknown as [string, RequestInit])[1].headers,
    );
    expect(getHeaders.has("X-CSRF-Token")).toBe(false);
    expect(postHeaders.get("X-CSRF-Token")).toBe("csrf-test-token");
  });
});
