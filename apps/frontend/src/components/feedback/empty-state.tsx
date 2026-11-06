import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional next-step control (e.g. "Add student" button/link). */
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/**
 * Empty state with clear next steps (global data-state rule). Every
 * data screen must render this instead of a blank area when a query
 * succeeds with zero results.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-input-border bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            <path d="M3 13h5l2 2h4l2-2h5" />
          </svg>
        )}
      </span>
      <h2 className="text-h5 font-semibold">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
