import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-surface-raised text-text border-border",
  success: "bg-success-surface text-success border-success/30",
  warning: "bg-warning-surface text-warning border-warning/30",
  error: "bg-error-surface text-error border-error/30",
  info: "bg-info-surface text-info border-info/30",
};

/**
 * Status pill. Colour is never the only signal — always pair with clear text
 * (e.g. "Connected" / "Not configured"), per a11y and device-status rules.
 */
export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
