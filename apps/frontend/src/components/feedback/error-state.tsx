import { normalizeApiError, type ApiErrorInfo } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  /** Raw error (normalized via normalizeApiError) or a ready ApiErrorInfo. */
  error?: unknown;
  title?: string;
  description?: string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error state for network/server/authorization failures, with retry where
 * safe and the backend request ID preserved for support. Distinguish 403
 * copy comes free via normalizeApiError's status mapping.
 */
export function ErrorState({
  error,
  title,
  description,
  requestId,
  onRetry,
  className,
}: ErrorStateProps) {
  const info: ApiErrorInfo | null =
    error === undefined ? null : normalizeApiError(error);
  const resolvedTitle = title ?? info?.friendlyTitle ?? "Something went wrong";
  const resolvedDescription =
    description ??
    info?.friendlyDescription ??
    "Please try again. If it keeps happening, contact support.";
  const resolvedRequestId = requestId ?? info?.requestId;

  return (
    <section
      role="alert"
      aria-label={resolvedTitle}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-error/30 bg-error-surface px-6 py-12 text-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10 text-error"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 8v5m0 3.5v.5M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
      </svg>
      <h2 className="text-h5 text-text">{resolvedTitle}</h2>
      <p className="max-w-md text-sm text-muted">{resolvedDescription}</p>
      {resolvedRequestId ? (
        <p className="text-caption text-muted">
          Request ID:{" "}
          <code className="font-mono break-all">{resolvedRequestId}</code>
        </p>
      ) : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </section>
  );
}
