import type { CapacityInfo } from "@/api/services/dashboards";
import { Alert } from "@/components/ui/alert";
import { CAPACITY_COPY, getCapacityLevel } from "@/lib/capacity";

/** Accessible usage meter (always paired with text numbers). */
export function CapacityMeter({ capacity }: { capacity: CapacityInfo }) {
  const level = getCapacityLevel(capacity);
  if (level === "unlimited") {
    return (
      <p className="text-sm text-muted">
        {capacity.activeStudents.toLocaleString()} active students · no fixed
        capacity cap on this plan.
      </p>
    );
  }
  const pct = Math.min(100, Math.max(0, capacity.usagePercent));
  const barColor =
    level === "full" || level === "critical"
      ? "bg-error"
      : level === "warning"
        ? "bg-warning"
        : "bg-success";
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Student capacity used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(capacity.usagePercent)}
        aria-valuetext={`${Math.round(capacity.usagePercent)} percent`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-border"
      >
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {capacity.activeStudents.toLocaleString()} of{" "}
        {capacity.capacityLimit?.toLocaleString()} active students (
        {Math.round(capacity.usagePercent)}%)
      </p>
    </div>
  );
}

/**
 * Capacity warnings per global rule: 80% visible, 90% stronger, 100%
 * enrollments blocked — while always stating existing data stays open.
 * Renders nothing below 80% (the meter still shows usage on dashboards).
 */
export function CapacityBanner({ capacity }: { capacity: CapacityInfo }) {
  const level = getCapacityLevel(capacity);
  if (level === "ok" || level === "unlimited") return null;
  const copy = CAPACITY_COPY[level];
  return (
    <Alert
      variant={level === "warning" ? "warning" : "error"}
      title={`${copy.title} — ${Math.round(capacity.usagePercent)}% used`}
    >
      {copy.description}
    </Alert>
  );
}
