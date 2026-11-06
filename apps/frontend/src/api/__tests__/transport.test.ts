import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiTransport, isMockTransport } from "../transport";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("transport selection", () => {
  it("uses the contract when a backend base URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_API_TRANSPORT", undefined);
    expect(getApiTransport()).toBe("contract");
    expect(isMockTransport()).toBe(false);
  });

  it("falls back to the demo mock when no backend URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_TRANSPORT", undefined);
    expect(getApiTransport()).toBe("mock");
    expect(isMockTransport()).toBe(true);
  });

  it("honours an explicit contract choice even without a backend URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_TRANSPORT", "contract");
    expect(getApiTransport()).toBe("contract");
  });

  it("honours an explicit mock choice", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_API_TRANSPORT", "mock");
    expect(getApiTransport()).toBe("mock");
  });
});
