import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl, tryGetApiBaseUrl } from "../env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiBaseUrl", () => {
  it("returns the configured URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1/");
    expect(getApiBaseUrl()).toBe("http://localhost:4000/api/v1");
  });

  it("throws an actionable error when the variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(() => getApiBaseUrl()).toThrow(/NEXT_PUBLIC_API_BASE_URL is not set/);
    expect(tryGetApiBaseUrl()).toBeNull();
  });

  it("throws when the value is not an absolute http(s) URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api/v1");
    expect(() => getApiBaseUrl()).toThrow(/must be a valid absolute URL/);

    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "ftp://localhost:4000/api/v1");
    expect(() => getApiBaseUrl()).toThrow(/must use http or https/);
  });
});
