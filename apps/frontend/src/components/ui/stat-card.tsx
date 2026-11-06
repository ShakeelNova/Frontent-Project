import { Card } from "@/components/ui/card";
import { Sparkline, type Tone } from "@/components/ui/charts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Percentage change; positive is green, negative is red. */
  trend?: number;
  trendLabel?: string;
  hint?: ReactNode;
  tone?: Tone;
  spark?: number[];
  href?: string;
  className?: string;
}

const TONE_SOFT: Record<Tone, string> = {
  purple: "bg-primary-soft text-primary",
  cyan: "bg-cyan-soft text-info",
  green: "bg-green-soft text-success",
  pink: "bg-pink-soft text-pink",
  amber: "bg-cream text-warning",
};

/**
 * Premium KPI card: icon tile, label, large value, trend pill, optional
 * sparkline and hint. Links wrap the whole card for drill-downs.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  hint,
  tone = "purple",
  spark,
  href,
  className,
}: StatCardProps) {
  const positive = (trend ?? 0) >= 0;
  const body = (
    <div className={cn("flex h-full flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-faint">{label}</p>
          <p className="mt-2 text-h3 font-bold tracking-[-0.03em] text-text">{value}</p>
        </div>
        {icon ? (
          <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_SOFT[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="min-w-0">
          {typeof trend === "number" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
                positive ? "bg-green-soft text-success" : "bg-error-surface text-error",
              )}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className={cn("h-3 w-3", !positive && "rotate-180")} fill="currentColor">
                <path d="M10 4l6 7h-4v5H8v-5H4l6-7Z" />
              </svg>
              {positive ? "+" : ""}{trend}%
            </span>
          ) : null}
          {trendLabel ? <p className="mt-1.5 text-caption text-faint">{trendLabel}</p> : null}
          {hint ? <div className="mt-1.5 text-caption text-muted">{hint}</div> : null}
        </div>
        {spark && spark.length > 1 ? <Sparkline data={spark} tone={tone} /> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label}: ${typeof value === "string" ? value : ""}. View details`}
        className="block h-full rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <Card className="h-full">{body}</Card>
      </Link>
    );
  }
  return <Card className="h-full">{body}</Card>;
}
