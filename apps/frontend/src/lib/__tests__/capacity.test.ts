import { CAPACITY_COPY, getCapacityLevel } from "@/lib/capacity";
import { describe, expect, it } from "vitest";

function cap(usagePercent: number, capacityLimit: number | null = 1000) {
  return { activeStudents: Math.round(usagePercent * 10), capacityLimit, usagePercent };
}

describe("getCapacityLevel (80/90/100 rule)", () => {
  it("maps usage to levels at exact thresholds", () => {
    expect(getCapacityLevel(cap(0))).toBe("ok");
    expect(getCapacityLevel(cap(79.9))).toBe("ok");
    expect(getCapacityLevel(cap(80))).toBe("warning");
    expect(getCapacityLevel(cap(89.9))).toBe("warning");
    expect(getCapacityLevel(cap(90))).toBe("critical");
    expect(getCapacityLevel(cap(99.9))).toBe("critical");
    expect(getCapacityLevel(cap(100))).toBe("full");
    expect(getCapacityLevel(cap(105))).toBe("full");
  });

  it("treats a null limit as unlimited regardless of percent", () => {
    expect(getCapacityLevel(cap(100, null))).toBe("unlimited");
  });

  it("full-capacity copy blocks only NEW enrollments, never existing records", () => {
    expect(CAPACITY_COPY.full.description).toMatch(/Existing records/);
    expect(CAPACITY_COPY.full.title).toMatch(/new enrollments blocked/i);
  });
});
