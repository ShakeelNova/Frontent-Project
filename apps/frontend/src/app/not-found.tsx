import { routes } from "@/lib/routes";
import { EmptyState } from "@/components/feedback/empty-state";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        action={
          <Link
            href={routes.home}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Go to home
          </Link>
        }
      />
    </main>
  );
}
