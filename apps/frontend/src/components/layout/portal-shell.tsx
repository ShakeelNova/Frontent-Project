"use client";

import { routes } from "@/lib/routes";

import type { OrgRole } from "@/api/services/organizations";
import { TenantControls } from "@/components/layout/tenant-controls";
import { useTenant } from "@/components/tenant/tenant-provider";
import { ThemeToggle } from "@/components/theme/theme";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export interface NavSectionDef {
  heading: string;
  items: Array<{
    label: string;
    href: string;
    minRole: OrgRole[] | "all";
    phaseNote?: string;
  }>;
}

/**
 * Role-aware navigation (convenience filtering ONLY — backend authorizes
 * every route/API call). Feature links land on honest stub pages until
 * their phases ship (phaseNote renders the "Soon" badge).
 */
export const NAV_SECTIONS: NavSectionDef[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: routes.portal.root, minRole: "all" },
      {
        label: "Branch dashboard",
        href: routes.portal.branch,
        minRole: ["owner", "general_manager"],
      },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Students", href: routes.portal.students, minRole: "all" },
      { label: "Academic structure", href: routes.portal.academics, minRole: ["owner", "general_manager", "branch_manager"] },
      { label: "Staff", href: routes.portal.staff, minRole: ["owner", "general_manager", "branch_manager"] },
      { label: "Attendance", href: routes.portal.attendance, minRole: "all" },
      { label: "Fees", href: routes.portal.fees, minRole: ["owner", "general_manager", "branch_manager"] },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Devices", href: routes.portal.devices, minRole: ["owner", "general_manager", "branch_manager"] },
      { label: "Imports", href: routes.portal.imports, minRole: ["owner", "general_manager"] },
    ],
  },
  {
    heading: "Admin",
    items: [
      { label: "Settings", href: routes.portal.settings, minRole: ["owner", "general_manager"] },
      { label: "Billing & subscription", href: routes.portal.billing, minRole: ["owner", "general_manager"] },
    ],
  },
  {
    heading: "Internal",
    items: [{ label: "Design system", href: routes.designSystem, minRole: "all" }],
  },
];

export function getVisibleNavSections(role: OrgRole | undefined): NavSectionDef[] {
  if (!role) {
    return NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.minRole === "all"),
    })).filter((s) => s.items.length > 0);
  }
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.minRole === "all" || i.minRole.includes(role)),
  })).filter((s) => s.items.length > 0);
}

function PortalNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentOrganization } = useTenant();
  const sections = getVisibleNavSections(currentOrganization?.role);

  return (
    <nav aria-label="Portal">
      {sections.map((section) => (
        <div key={section.heading} className="mb-5">
          <p className="px-3 pb-1.5 text-caption font-semibold tracking-wide text-muted uppercase">
            {section.heading}
          </p>
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const isActive =
                item.href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-text hover:bg-surface-raised",
                    )}
                  >
                    {item.label}
                    {item.phaseNote ? (
                      <Badge variant={isActive ? "info" : "default"}>
                        {item.phaseNote}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function PortalUserArea() {
  const { user, isLoading, signOut, isSigningOut } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <p className="hidden text-sm text-muted md:block">Checking session…</p>;
  }
  if (!user) {
    return (
      <Link
        href={routes.auth.signIn}
        className="inline-flex min-h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Sign in
      </Link>
    );
  }
  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
      >
        {initials}
      </span>
      <p className="hidden text-sm xl:block">
        <span className="font-medium">{user.fullName}</span>{" "}
        <span className="text-muted">· {user.email}</span>
      </p>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={async () => {
          await signOut().catch(() => undefined);
          router.push(routes.auth.signIn);
        }}
        className="inline-flex min-h-9 items-center rounded-md border border-border px-3.5 text-sm font-medium text-text hover:bg-surface-raised disabled:opacity-60"
      >
        Sign out
      </button>
    </div>
  );
}

/**
 * Authenticated portal shell: top bar (tenant scope + user), side nav
 * (role-aware), main. Responsive: side nav becomes a drawer below `md`.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath !== null && drawerPath === pathname;
  const setDrawerOpen = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(drawerOpen) : next;
      setDrawerPath(value ? pathname : null);
    },
    [drawerOpen, pathname],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-6">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border md:hidden"
            aria-expanded={drawerOpen}
            aria-controls="portal-mobile-nav"
            aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" fill="currentColor">
              <path d="M3 5h14v1.5H3V5zm0 4.25h14v1.5H3v-1.5zM3 13.5h14V15H3v-1.5z" />
            </svg>
          </button>

          <p className="hidden shrink-0 text-base font-bold tracking-tight sm:block">
            Fluxeaze
          </p>
          <TenantControls />

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ThemeToggle />
            <PortalUserArea />
          </div>
        </div>

        {drawerOpen ? (
          <div
            id="portal-mobile-nav"
            data-testid="portal-mobile-nav"
            className="max-h-[70dvh] overflow-y-auto border-t border-border bg-surface px-4 py-3 md:hidden"
          >
            <PortalNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        ) : null}
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-surface px-3 py-4 md:block">
          <PortalNav />
        </aside>
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
