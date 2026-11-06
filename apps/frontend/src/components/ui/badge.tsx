import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "cyan"
  | "pink"
  | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-surface-raised text-text-secondary border-border",
  success: "bg-green-soft text-success border-green/25",
  warning: "bg-cream text-warning border-warning/20",
  error: "bg-error-surface text-error border-error/20",
  info: "bg-cyan-soft text-info border-cyan/25",
  purple: "bg-primary-soft text-primary border-primary/20",
  cyan: "bg-cyan-soft text-info border-cyan/25",
  pink: "bg-pink-soft text-pink border-pink/20",
  neutral: "bg-surface-subtle text-muted border-border",
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-faint",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  purple: "bg-primary",
  cyan: "bg-cyan",
  pink: "bg-pink",
  neutral: "bg-faint",
};

/**
 * Status pill. Colour is never the only signal — always pair with clear text
 * (e.g. "Connected" / "Not configured"), per a11y and device-status rules.
 */
export function Badge({ variant = "default", className, dot, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[variant])} />
      ) : null}
      {children}
    </span>
  );
}
