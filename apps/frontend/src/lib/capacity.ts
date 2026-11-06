import type { CapacityInfo } from "@/api/services/dashboards";

/**
 * Capacity presentation levels (global business rule):
 * ≥80% visible warning · ≥90% stronger · ≥100% new qualifying active
 * enrollments blocked — but existing records/histories NEVER blocked.
 * Usage numbers always come from the API; this only maps level → UI.
 */
export type CapacityLevel = "ok" | "warning" | "critical" | "full" | "unlimited";

export function getCapacityLevel(capacity: CapacityInfo): CapacityLevel {
  if (capacity.capacityLimit === null) return "unlimited";
  if (capacity.usagePercent >= 100) return "full";
  if (capacity.usagePercent >= 90) return "critical";
  if (capacity.usagePercent >= 80) return "warning";
  return "ok";
}

export const CAPACITY_COPY: Record<
  Exclude<CapacityLevel, "ok" | "unlimited">,
  { title: string; description: string }
> = {
  warning: {
    title: "Student capacity above 80%",
    description:
      "You're using most of your active-student capacity. Consider reviewing inactive enrollments or planning a capacity increase.",
  },
  critical: {
    title: "Student capacity is nearly full (90%+)",
    description:
      "Plan a capacity increase soon — at 100%, new active enrollments will be blocked. Existing students and records are never affected.",
  },
  full: {
    title: "Student capacity full — new enrollments blocked",
    description:
      "New qualifying active enrollments are blocked while at 100%. Upgrade your plan, or deactivate students who have left. Existing records, attendance and fee history remain fully accessible.",
  },
};
