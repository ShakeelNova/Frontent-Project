import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type AlertVariant = "error" | "warning" | "success" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  /** Backend request ID for support (shown when provided). */
  requestId?: string;
  className?: string;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "border-error/30 bg-error-surface text-text",
  warning: "border-warning/30 bg-warning-surface text-text",
  success: "border-success/30 bg-success-surface text-text",
  info: "border-info/30 bg-info-surface text-text",
};

/**
 * Inline page/form-level message (form submit failures, notices).
 * Errors use role="alert"; other variants role="status".
 */
export function Alert({
  variant = "info",
  title,
  children,
  requestId,
  className,
}: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm", VARIANT_CLASSES[variant], className)}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      {requestId ? (
        <p className="mt-2 text-caption text-muted">
          Request ID: <code className="font-mono break-all">{requestId}</code>
        </p>
      ) : null}
    </div>
  );
}
