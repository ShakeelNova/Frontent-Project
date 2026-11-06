import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Full-page loading indicator (route transitions, page-level queries). */
export function PageLoading({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/** Alias matching the name used in phase specs. */
export const PageSpinner = PageLoading;
