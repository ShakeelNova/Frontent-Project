import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  /** Accessible label; omit when a parent already announces loading. */
  label?: string;
}

/** Inline SVG spinner (no icon dependency). Decorative unless labelled. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <svg
      className={cn("h-5 w-5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10v3a7 7 0 0 1 7 7h3z"
        fill="currentColor"
        className="opacity-90"
      />
    </svg>
  );
}
