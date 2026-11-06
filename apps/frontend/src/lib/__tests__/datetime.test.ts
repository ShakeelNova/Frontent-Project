import {
  formatPlainDate,
  formatUtcTimeInZone,
  zonedTimeToUtc,
} from "@/lib/datetime";
import { describe, expect, it } from "vitest";

describe("datetime (org-timezone display, UTC storage)", () => {
  it("converts UTC wall-clock to Asia/Karachi (+5)", () => {
    expect(formatUtcTimeInZone("03:00", "Asia/Karachi")).toBe("08:00");
    expect(formatUtcTimeInZone("03:45", "Asia/Karachi")).toBe("08:45");
  });

  it("is identity in UTC", () => {
    expect(formatUtcTimeInZone("09:30", "UTC")).toBe("09:30");
    expect(zonedTimeToUtc("09:30", "UTC")).toBe("09:30");
  });

  it("round-trips local → UTC → local", () => {
    const utc = zonedTimeToUtc("08:00", "Asia/Karachi");
    expect(utc).toBe("03:00");
    expect(formatUtcTimeInZone(utc, "Asia/Karachi")).toBe("08:00");
  });

  it("handles half-hour zones", () => {
    expect(formatUtcTimeInZone("03:00", "Asia/Kolkata")).toBe("08:30");
    expect(zonedTimeToUtc("08:30", "Asia/Kolkata")).toBe("03:00");
  });

  it("formats plain dates without timezone shifting", () => {
    expect(formatPlainDate("2026-08-01")).toBe("01 Aug 2026");
    expect(formatPlainDate("")).toBe("—");
  });
});
