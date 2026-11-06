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
  error: "border-error/20 bg-error-surface text-error",
  warning: "border-warning/20 bg-cream text-warning",
  success: "border-success/20 bg-green-soft text-success",
  info: "border-cyan/25 bg-cyan-soft text-info",
};

const ICONS: Record<AlertVariant, ReactNode> = {
  error: (
    <path d="M12 8v5m0 3.5v.5M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
  ),
  warning: (
    <path d="M12 8v5m0 3.5v.5M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
  ),
  success: <path d="M8.2 13.3 5 10.1l-1.1 1.1 4.3 4.3 8-8-1.1-1.1-6.9 6.9Z" />,
  info: <path d="M10 9h2v6h-2V9Zm0-3h2v2h-2V6Z" />,
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
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3.5 text-sm",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="mt-0.5 h-4.5 w-4.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[variant]}
      </svg>
      <div className="min-w-0 flex-1 text-text">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1", "text-muted")}>{children}</div> : null}
        {requestId ? (
          <p className="mt-2 text-caption text-faint">
            Request ID: <code className="font-mono break-all">{requestId}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
