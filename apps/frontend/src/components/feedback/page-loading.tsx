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
        "flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
        <Spinner className="h-6 w-6 text-primary" />
      </span>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/** Alias matching the name used in phase specs. */
export const PageSpinner = PageLoading;
