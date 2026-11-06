import { routes } from "@/lib/routes";
import { AuthHeaderActions } from "@/components/layout/auth-header-actions";
import { ThemeToggle } from "@/components/theme/theme";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Public / entry chrome: landing, pricing, request-pilot, auth, invite.
 * Marketing content itself arrives in the public-pages phase — this is the
 * honest structural shell (header + footer) only.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
          <Link href={routes.home} className="text-base font-bold tracking-tight">
            Fluxeaze
          </Link>
          <nav aria-label="Public" className="flex flex-wrap items-center gap-4 text-sm">
            <Link href={routes.home} className="text-muted hover:text-text">
              Home
            </Link>
            <Link href={routes.pricing} className="text-muted hover:text-text">
              Pricing
            </Link>
            <Link href={routes.requestPilot} className="text-muted hover:text-text">
              Request a pilot
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <AuthHeaderActions />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Fluxeaze — Make work flow easier. Manage less. Accomplish more.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href={routes.pricing} className="hover:text-text">
              Pricing
            </Link>
            <Link href={routes.portal.root} className="hover:text-text">
              Portal
            </Link>
            <Link href={routes.designSystem} className="hover:text-text">
              Design system
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
