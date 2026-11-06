"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-field";
import { RANGE_LABELS, RANGE_PRESETS, type RangePreset } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Dashboard date filters driven by URL search params (preset/from/to), so
 * ranges are shareable and refetch via the dashboard query keys.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePreset = (searchParams.get("preset") as RangePreset | null) ?? "week";
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  const go = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const onCustomSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (customFrom && customTo && customFrom <= customTo) {
      go({ preset: "custom", from: customFrom, to: customTo });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
        {RANGE_PRESETS.filter((p) => p !== "custom").map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={activePreset === preset}
            onClick={() => go({ preset, from: null, to: null })}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium",
              activePreset === preset
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-text hover:bg-surface-raised",
            )}
          >
            {RANGE_LABELS[preset]}
          </button>
        ))}
        <span
          aria-pressed={activePreset === "custom"}
          className={cn(
            "inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium",
            activePreset === "custom"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted",
          )}
        >
          {activePreset === "custom"
            ? `${searchParams.get("from")} → ${searchParams.get("to")}`
            : RANGE_LABELS.custom}
        </span>
      </div>

      <form onSubmit={onCustomSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="range-from">From</Label>
          <Input
            id="range-from"
            type="date"
            className="w-auto"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="range-to">To</Label>
          <Input
            id="range-to"
            type="date"
            className="w-auto"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
        <Button type="submit" variant="subtle" size="sm">
          Apply custom range
        </Button>
      </form>
    </div>
  );
}
