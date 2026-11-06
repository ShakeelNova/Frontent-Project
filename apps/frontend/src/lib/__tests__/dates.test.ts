import { resolveDateRange, toISODate } from "@/lib/dates";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 25)); // Sun Oct 25 2026 (local)
});
afterEach(() => vi.useRealTimers());

describe("resolveDateRange", () => {
  it("today → same from/to", () => {
    expect(resolveDateRange({ preset: "today" })).toEqual({
      preset: "today",
      from: "2026-10-25",
      to: "2026-10-25",
    });
  });

  it("week → last 7 inclusive days ending today (default for junk input)", () => {
    expect(resolveDateRange({ preset: "week" })).toEqual({
      preset: "week",
      from: "2026-10-19",
      to: "2026-10-25",
    });
    expect(resolveDateRange({ preset: "bogus" }).preset).toBe("week");
  });

  it("month → last 30 inclusive days", () => {
    expect(resolveDateRange({ preset: "month" })).toEqual({
      preset: "month",
      from: "2026-09-26",
      to: "2026-10-25",
    });
  });

  it("custom honours valid from/to, falls back to week when inverted", () => {
    expect(resolveDateRange({ preset: "custom", from: "2026-01-05", to: "2026-01-20" })).toEqual({
      preset: "custom",
      from: "2026-01-05",
      to: "2026-01-20",
    });
    expect(resolveDateRange({ preset: "custom", from: "2026-01-20", to: "2026-01-05" }).preset).toBe("week");
  });

  it("toISODate zero-pads", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
