import { routes } from "@/lib/routes";
import { PublicHeader } from "@/components/layout/public-header";
import { BrandMark } from "@/components/ui/icon";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Public / entry chrome: premium marketing header + footer.
 * Auth, invite and design-system routes share this shell.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-lg"
      >
        Skip to main content
      </a>
      <PublicHeader />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-8 w-8" />
              <span className="text-base font-bold tracking-[-0.02em] text-text">Fluxeaze</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Make work flow easier. Manage less. Accomplish more. The Education
              Operations OS for multi-branch institutions.
            </p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-faint">Product</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href={routes.home} className="transition-colors hover:text-text">Overview</Link></li>
              <li><Link href={routes.pricing} className="transition-colors hover:text-text">Pricing</Link></li>
              <li><Link href={routes.requestPilot} className="transition-colors hover:text-text">Request a pilot</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-faint">Access</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href={routes.auth.signIn} className="transition-colors hover:text-text">Sign in</Link></li>
              <li><Link href={routes.auth.signUp} className="transition-colors hover:text-text">Create account</Link></li>
              <li><Link href={routes.auth.organizations} className="transition-colors hover:text-text">Organizations</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-faint">Company</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <li><Link href={routes.requestPilot} className="transition-colors hover:text-text">Contact</Link></li>
              <li><Link href={routes.portal.root} className="transition-colors hover:text-text">Portal</Link></li>
              <li><Link href={routes.student.root} className="transition-colors hover:text-text">Student &amp; parent</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-caption text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} Fluxeaze. All rights reserved.</p>
            <p>Built for schools, colleges, academies and technical institutes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
