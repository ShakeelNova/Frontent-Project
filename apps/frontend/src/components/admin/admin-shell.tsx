"use client";

import { routes } from "@/lib/routes";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/feedback/page-loading";
import { BrandMark, Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Overview", href: routes.admin.root, icon: "dashboard" as const },
  { label: "Plans & versions", href: routes.admin.plans, icon: "layers" as const },
  { label: "Resources & rates", href: routes.admin.resources, icon: "chart" as const },
  { label: "Add-ons", href: routes.admin.addons, icon: "plus" as const },
  { label: "Enterprise quotes", href: routes.admin.quotes, icon: "billing" as const },
  { label: "Audit history", href: routes.admin.audit, icon: "shield" as const },
];

/**
 * Platform-admin shell + gate. Premium internal workspace, visually
 * consistent with the product but clearly labelled as Fluxeaze-internal.
 * UX gating only: every admin API call independently re-authorizes.
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

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <PageLoading label="Checking platform-admin session…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <PageLoading label="Redirecting to sign in…" />
      </div>
    );
  }

  if (!user.isPlatformAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <BrandMark className="mx-auto h-12 w-12" />
          <Badge variant="purple" className="mt-4">
            Platform admins only
          </Badge>
          <h1 className="mt-3 text-h4 font-semibold tracking-[-0.02em]">Restricted workspace</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You&apos;re signed in as {user.fullName} ({user.email}), which isn&apos;t a
            Fluxeaze platform-administrator account. Plan catalogues, provider rates,
            margins and quotes are internal.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="subtle" onClick={handleSignOut} isLoading={isSigningOut}>
              Sign out
            </Button>
            <Link
              href={routes.home}
              className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
            >
              Back to the public site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      sections={[{ heading: "Platform", items: NAV_ITEMS }]}
      user={{ name: user.fullName, email: user.email, role: "Platform admin" }}
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
      sidebarContext={
        <div className="rounded-xl border border-border bg-surface-raised px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">Fluxeaze Platform</p>
              <p className="truncate text-caption text-faint">Internal workspace</p>
            </div>
          </div>
          <Badge variant="purple" className="mt-2">
            Platform admin
          </Badge>
        </div>
      }
      brandSubtitle="Platform Admin"
      commandItems={[
        { label: "Public pricing page", href: routes.pricing, group: "Quick actions", keywords: "plans catalogue" },
        { label: "Plan catalogue", href: routes.admin.plans, group: "Quick actions", keywords: "versions publish" },
        { label: "Enterprise quotes", href: routes.admin.quotes, group: "Quick actions", keywords: "quote convert" },
      ]}
    >
      {children}
    </AppShell>
  );
}
