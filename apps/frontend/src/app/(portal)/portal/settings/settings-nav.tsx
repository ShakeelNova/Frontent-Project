"use client";

import { routes } from "@/lib/routes";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Organization profile", href: routes.portal.settings },
  { label: "Branches", href: routes.portal.settingsBranches },
  { label: "Timezone & currency", href: routes.portal.settingsPreferences },
  { label: "Academic year", href: routes.portal.settingsAcademicYear },
  { label: "Academic preferences", href: routes.portal.settingsAcademic },
  { label: "Roles & permissions", href: routes.portal.settingsRoles },
  { label: "Integrations", href: routes.portal.settingsIntegrations },
  { label: "Security", href: routes.portal.settingsSecurity },
  { label: "Backup & restore", href: routes.portal.settingsBackup },
  { label: "Onboarding", href: routes.portal.settingsOnboarding },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-text hover:bg-surface-raised",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
