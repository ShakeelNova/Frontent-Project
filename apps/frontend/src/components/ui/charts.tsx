"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

export type Tone = "purple" | "cyan" | "green" | "pink" | "amber";

const TONE_HEX: Record<Tone, string> = {
  purple: "#705eff",
  cyan: "#1dced8",
  green: "#55e07e",
  pink: "#ff6082",
  amber: "#a16207",
};

export interface Point {
  label: string;
  value: number;
}

function buildPath(values: number[], width: number, height: number, pad = 4) {
  if (values.length === 0) return { line: "", area: "", points: [] as Array<{ x: number; y: number }> };
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => ({
    x: pad + index * stepX,
    y: height - pad - ((value - min) / span) * (height - pad * 2),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1]?.x.toFixed(2)},${height} L${points[0]?.x.toFixed(2)},${height} Z`;
  return { line, area, points };
}

/** Lightweight inline sparkline (no chart dependency). */
export function Sparkline({
  data,
  tone = "purple",
  className,
}: {
  data: number[];
  tone?: Tone;
  className?: string;
}) {
  const width = 96;
  const height = 32;
  const { line, area } = buildPath(data, width, height, 2);
  const gradientId = useId().replace(/[:]/g, "");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-8 w-24 overflow-visible", className)}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE_HEX[tone]} stopOpacity="0.22" />
          <stop offset="100%" stopColor={TONE_HEX[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={TONE_HEX[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Responsive area chart with grid lines, labels and a soft gradient fill. */
export function AreaChart({
  data,
  height = 220,
  tone = "purple",
  valuePrefix = "",
  valueSuffix = "",
  className,
}: {
  data: Point[];
  height?: number;
  tone?: Tone;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}) {
  const width = 720;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const chartHeight = height - padTop - padBottom;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = 0;
  const span = max - min || 1;
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, index) => ({
    x: padX + index * stepX,
    y: padTop + chartHeight - ((d.value - min) / span) * chartHeight,
  }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1]?.x.toFixed(2)},${padTop + chartHeight} L${points[0]?.x.toFixed(2)},${padTop + chartHeight} Z`;
  const gradientId = useId().replace(/[:]/g, "");
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Area chart: ${data.map((d) => `${d.label} ${valuePrefix}${d.value}${valueSuffix}`).join(", ")}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TONE_HEX[tone]} stopOpacity="0.28" />
            <stop offset="100%" stopColor={TONE_HEX[tone]} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines.map((ratio) => {
          const y = padTop + chartHeight * ratio;
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : "3 5"}
            />
          );
        })}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={TONE_HEX[tone]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={data[index]?.label ?? index}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="var(--color-surface)"
            stroke={TONE_HEX[tone]}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between gap-2 px-1">
        {data.map((d) => (
          <span key={d.label} className="truncate text-caption text-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vertical bar chart with rounded bars and value labels. */
export function BarChart({
  data,
  height = 200,
  tone = "purple",
  valueSuffix = "",
  className,
}: {
  data: Point[];
  height?: number;
  tone?: Tone;
  valueSuffix?: string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d) => {
          const pct = Math.max(4, (d.value / max) * 100);
          return (
            <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-caption font-medium text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                {d.value.toLocaleString()}{valueSuffix}
              </span>
              <div
                className="w-full max-w-12 rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                style={{
                  height: `${pct}%`,
                  backgroundColor: TONE_HEX[tone],
                  minHeight: 6,
                }}
                title={`${d.label}: ${d.value.toLocaleString()}${valueSuffix}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-caption text-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut / progress ring with a centred label. */
export function Donut({
  value,
  size = 132,
  stroke = 12,
  tone = "purple",
  label,
  caption,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  caption?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-subtle)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_HEX[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-h4 font-bold tracking-tight text-text">{label ?? `${Math.round(clamped)}%`}</span>
        {caption ? <span className="mt-0.5 text-caption text-faint">{caption}</span> : null}
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: Array<{ label: string; tone: Tone; value?: string }>;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2 text-caption text-muted">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TONE_HEX[item.tone] }}
          />
          <span>{item.label}</span>
          {item.value ? <span className="font-semibold text-text">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
