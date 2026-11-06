import type { DateRange } from "@/api/services/dashboards";

/** Local yyyy-mm-dd (dashboard filters are calendar dates, not instants). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const RANGE_PRESETS = ["today", "week", "month", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  custom: "Custom range",
};

/** Resolves preset/custom search params into an inclusive DateRange. */
export function resolveDateRange(params: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
}): DateRange {
  const today = new Date();
  const preset = (RANGE_PRESETS as readonly string[]).includes(params.preset ?? "")
    ? (params.preset as RangePreset)
    : "week";

  if (preset === "custom" && params.from && params.to && params.from <= params.to) {
    return { preset, from: params.from, to: params.to };
  }
  if (preset === "today") {
    const d = toISODate(today);
    return { preset, from: d, to: d };
  }
  const days = preset === "month" ? 29 : 6;
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  return {
    preset: preset === "custom" ? "week" : preset,
    from: toISODate(start),
    to: toISODate(today),
  };
}

export function rangeKey(range: DateRange): string {
  return `${range.preset}:${range.from}..${range.to}`;
}
