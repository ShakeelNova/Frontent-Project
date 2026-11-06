import {
  captureMockState,
  isMockSnapshot,
  restoreMockState,
  snapshotSummary,
} from "@/api/mock/state";
import { describe, expect, it } from "vitest";

describe("local persistence snapshot", () => {
  it("captures a valid, versioned snapshot", () => {
    const snapshot = captureMockState();
    expect(isMockSnapshot(snapshot)).toBe(true);
    expect(snapshot.version).toBe(1);
    expect(typeof snapshot.capturedAt).toBe("string");
    expect(snapshot.data).toHaveProperty("school");
    expect(snapshot.data).toHaveProperty("portal");
    expect(snapshot.data).toHaveProperty("fees");
  });

  it("round-trips the snapshot without changing the data", () => {
    const before = JSON.stringify(captureMockState().data);
    restoreMockState(captureMockState());
    const after = JSON.stringify(captureMockState().data);
    expect(after).toBe(before);
  });

  it("produces a readable text summary", () => {
    const summary = snapshotSummary(captureMockState());
    expect(summary).toContain("Fluxeaze — local data summary");
    expect(summary).toContain("Students:");
    expect(summary).toContain("Fee vouchers:");
  });

  it("rejects malformed snapshots", () => {
    expect(isMockSnapshot(null)).toBe(false);
    expect(isMockSnapshot({ version: 99, capturedAt: "x", data: {} })).toBe(false);
    expect(isMockSnapshot({ version: 1, capturedAt: "x" })).toBe(false);
  });
});
