import { cn } from "@/lib/utils";

/**
 * Loading placeholder block. Decorative (aria-hidden) — the surrounding
 * region should announce loading via role="status" (see PageLoading).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-shimmer rounded-lg", className)}
    />
  );
}
