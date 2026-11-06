"use client";

import { routes } from "@/lib/routes";

import { PageLoading } from "@/components/feedback/page-loading";
import { ThemeToggle } from "@/components/theme/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Overview", href: routes.admin.root },
  { label: "Plans & versions", href: routes.admin.plans },
  { label: "Resources & rates", href: routes.admin.resources },
  { label: "Add-ons", href: routes.admin.addons },
  { label: "Enterprise quotes", href: routes.admin.quotes },
  { label: "Audit history", href: routes.admin.audit },
];

/**
 * Platform-admin shell + gate (Phase 8). Visually distinct from every
 * tenant surface (warning band, internal labeling). UX gating only:
 * signed-out → sign-in with return target; any non-platform-admin session
 * gets the restricted panel — and every admin API call independently
 * 403s, so internal cost data can never render for tenants.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut, isSigningOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(pathname || "/admin");
      router.replace(routes.auth.signInNext(next));
    }
  }, [isLoading, user, pathname, router]);

  const handleSignOut = async () => {
    await signOut().catch(() => undefined);
    router.push(routes.auth.signIn);
  };

  return (
    <div className="flex min-h-dvh flex-col border-t-4 border-warning">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
      >
        Skip to main content
      </a>
      <header className="border-b-2 border-warning/50 bg-surface">
        <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <p className="text-base font-bold tracking-tight">
            Fluxeaze <span className="font-normal text-muted">· Platform admin</span>
          </p>
          <Badge variant="warning">Internal — costs & margins visible here only</Badge>
          <nav aria-label="Platform admin" className="flex flex-wrap items-center gap-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 font-medium",
                    isActive
                      ? "bg-warning/20 text-text"
                      : "text-muted hover:bg-surface-raised hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href={routes.pricing} className="hidden text-sm font-medium text-primary underline sm:inline">
              View public pricing
            </Link>
            <ThemeToggle />
            {user ? (
              <>
                <p className="hidden text-sm xl:block">
                  <span className="font-medium">{user.fullName}</span>{" "}
                  <span className="text-muted">· {user.email}</span>
                </p>
                <Button variant="subtle" isLoading={isSigningOut} onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 px-4 py-6 sm:px-6">
        {isLoading ? (
          <PageLoading label="Checking platform-admin session…" />
        ) : !user ? (
          <PageLoading label="Redirecting to sign in…" />
        ) : !user.isPlatformAdmin ? (
          <div className="mx-auto w-full max-w-3xl py-10">
            <h1 className="text-h3">Platform admins only</h1>
            <p className="mt-2 text-muted">
              You&apos;re signed in as {user.fullName} ({user.email}), which
              isn&apos;t a Fluxeaze platform-administrator account. Plan
              catalogues, provider rates, margins and quotes are internal —
              the backend rejects these calls for tenant sessions.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="subtle" isLoading={isSigningOut} onClick={handleSignOut}>
                Sign out
              </Button>
              <Link
                href={routes.home}
                className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Back to the public site
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
