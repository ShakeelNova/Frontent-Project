import { getVisibleNavSections } from "@/components/layout/portal-shell";
import { describe, expect, it } from "vitest";

function labels(role: Parameters<typeof getVisibleNavSections>[0]): string[] {
  return getVisibleNavSections(role).flatMap((s) => s.items.map((i) => i.label));
}

describe("getVisibleNavSections (display convenience only; backend authorizes)", () => {
  it("owner sees everything incl. Billing", () => {
    const l = labels("owner");
    expect(l).toContain("Billing & subscription");
    expect(l).toContain("Imports");
    expect(l).toContain("Settings");
    expect(l).toContain("Branch dashboard");
  });

  it("general manager has billing access (Phase 8) plus settings/imports", () => {
    const l = labels("general_manager");
    expect(l).toContain("Billing & subscription");
    expect(l).toContain("Imports");
    expect(l).toContain("Settings");
  });

  it("branch manager lacks settings, imports, billing and the separate branch-dashboard item", () => {
    const l = labels("branch_manager");
    expect(l).not.toContain("Settings");
    expect(l).not.toContain("Imports");
    expect(l).not.toContain("Billing & subscription");
    expect(l).not.toContain("Branch dashboard");
    // but keeps operational items
    expect(l).toContain("Students");
    expect(l).toContain("Attendance");
    expect(l).toContain("Fees");
    expect(l).toContain("Staff");
  });

  it("unknown/undefined role only gets all-role items (fail closed in UI)", () => {
    const l = labels(undefined);
    expect(l).toContain("Dashboard");
    expect(l).toContain("Attendance");
    expect(l).not.toContain("Fees");
    expect(l).not.toContain("Settings");
  });
});
