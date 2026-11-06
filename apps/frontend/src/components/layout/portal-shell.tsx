"use client";

import { routes } from "@/lib/routes";

import type { OrgRole } from "@/api/services/organizations";
import { AppShell, type AppNavSection } from "@/components/layout/app-shell";
import { TenantControls } from "@/components/layout/tenant-controls";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import type { IconName } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItemDef {
  label: string;
  href: string;
  icon: IconName;
  minRole: OrgRole[] | "all";
}

export interface NavSectionDef {
  heading: string;
  items: NavItemDef[];
}

/**
 * Role-aware navigation (convenience filtering ONLY — backend authorizes
 * every route/API call).
 */
export const NAV_SECTIONS: NavSectionDef[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: routes.portal.root, icon: "dashboard", minRole: "all" },
      {
        label: "Branch dashboard",
        href: routes.portal.branch,
        icon: "chart",
        minRole: ["owner", "general_manager"],
      },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Students", href: routes.portal.students, icon: "students", minRole: "all" },
      {
        label: "Academic structure",
        href: routes.portal.academics,
        icon: "academics",
        minRole: ["owner", "general_manager", "branch_manager"],
      },
      {
        label: "Staff",
        href: routes.portal.staff,
        icon: "staff",
        minRole: ["owner", "general_manager", "branch_manager"],
      },
      { label: "Attendance", href: routes.portal.attendance, icon: "attendance", minRole: "all" },
      {
        label: "Fees",
        href: routes.portal.fees,
        icon: "fees",
        minRole: ["owner", "general_manager", "branch_manager"],
      },
    ],
  },
  {
    heading: "Operations",
    items: [
      {
        label: "Devices",
        href: routes.portal.devices,
        icon: "devices",
        minRole: ["owner", "general_manager", "branch_manager"],
      },
      {
        label: "Imports",
        href: routes.portal.imports,
        icon: "imports",
        minRole: ["owner", "general_manager"],
      },
    ],
  },
  {
    heading: "Admin",
    items: [
      {
        label: "Settings",
        href: routes.portal.settings,
        icon: "settings",
        minRole: ["owner", "general_manager"],
      },
      {
        label: "Billing & subscription",
        href: routes.portal.billing,
        icon: "billing",
        minRole: ["owner", "general_manager"],
      },
    ],
  },
];

export function getVisibleNavSections(role: OrgRole | undefined): NavSectionDef[] {
  if (!role) {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.minRole === "all"),
    })).filter((section) => section.items.length > 0);
  }
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.minRole === "all" || item.minRole.includes(role),
    ),
  })).filter((section) => section.items.length > 0);
}

function toAppSections(role: OrgRole | undefined): AppNavSection[] {
  return getVisibleNavSections(role).map((section) => ({
    heading: section.heading,
    items: section.items.map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
    })),
  }));
}

/**
 * Authenticated organization portal shell: premium sidebar, top bar with
 * tenant scope + search + notifications + profile, and motion-aware mobile
 * navigation. Role filtering is UX only; the backend authorizes every call.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { user, signOut, isSigningOut } = useAuth();
  const { currentOrganization, currentBranch } = useTenant();
  const router = useRouter();

  const role = currentOrganization?.role;
  const roleLabel = currentOrganization?.roleLabel;

  const handleSignOut = async () => {
    await signOut().catch(() => undefined);
    router.push(routes.auth.signIn);
  };

  const sidebarContext = currentOrganization ? (
    <div className="rounded-xl border border-border bg-surface-raised px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="currentColor">
            <path d="M3 21V5l7-3 7 3v16h-5v-5H8v5H3Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{currentOrganization.name}</p>
          <p className="truncate text-caption text-faint">
            {currentBranch?.name ?? "All branches"}
          </p>
        </div>
      </div>
      {roleLabel ? (
        <Badge variant="purple" className="mt-2">
          {roleLabel}
        </Badge>
      ) : null}
    </div>
  ) : null;

  return (
    <AppShell
      sections={toAppSections(role)}
      user={
        user
          ? { name: user.fullName, email: user.email, role: roleLabel }
          : null
      }
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
      settingsHref={routes.portal.settings}
      helpHref={routes.portal.settingsOnboarding}
      topbarLeading={<TenantControls />}
      sidebarContext={sidebarContext}
      brandSubtitle="Education Operations"
      commandItems={[
        { label: "Add a student", href: routes.portal.students, group: "Quick actions", icon: <span className="text-primary">+</span>, keywords: "new admission enroll" },
        { label: "Take attendance", href: routes.portal.attendance, group: "Quick actions", keywords: "mark register class" },
        { label: "Generate fee vouchers", href: routes.portal.fees, group: "Quick actions", keywords: "fees billing invoice" },
        { label: "Invite staff", href: routes.portal.staff, group: "Quick actions", keywords: "team teacher invite" },
        { label: "Import data", href: routes.portal.imports, group: "Quick actions", keywords: "csv excel upload" },
        { label: "Organization settings", href: routes.portal.settings, group: "Quick actions", keywords: "profile branches preferences" },
      ]}
    >
      {children}
    </AppShell>
  );
}
