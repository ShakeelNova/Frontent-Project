"use client";

import { normalizeApiError } from "@/api/errors";
import { ErrorState } from "@/components/feedback/error-state";
import { useEffect } from "react";

/** Route-segment error boundary (unexpected render/data failures). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Later phases: report to observability with request ID/digest.
    console.error(error);
  }, [error]);

  const info = normalizeApiError(error);
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <ErrorState
        title={info.friendlyTitle}
        description={info.friendlyDescription}
        requestId={error.digest ?? info.requestId}
        onRetry={reset}
      />
    </main>
  );
}
