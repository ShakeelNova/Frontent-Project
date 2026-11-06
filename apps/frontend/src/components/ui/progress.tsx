import { cn } from "@/lib/utils";

export type ProgressTone = "purple" | "cyan" | "green" | "pink" | "amber" | "error";

const TONES: Record<ProgressTone, string> = {
  purple: "bg-primary",
  cyan: "bg-cyan",
  green: "bg-green",
  pink: "bg-pink",
  amber: "bg-warning",
  error: "bg-error",
};

/** Accessible progress bar. Always pair with a visible numeric label. */
export function Progress({
  value,
  tone = "purple",
  label,
  className,
  size = "md",
}: {
  value: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3" } as const;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${Math.round(clamped)} percent`}
      className={cn("w-full overflow-hidden rounded-full bg-surface-subtle", heights[size], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
