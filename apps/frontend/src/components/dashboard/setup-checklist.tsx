"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getSetupStatus, type SetupStatus } from "@/api/services/setup";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

interface ChecklistItem {
  key: keyof Omit<SetupStatus, "organizationId">;
  label: string;
  description: string;
  href: string;
  cta: string;
}

const ITEMS: ChecklistItem[] = [
  {
    key: "profileComplete",
    label: "Organization profile",
    description: "Name, logo and contact details shown across Fluxeaze.",
    href: routes.portal.settings,
    cta: "Edit profile",
  },
  {
    key: "hasBranches",
    label: "Add your branches",
    description: "Campuses/branches structure everything else — students, staff, fees.",
    href: routes.portal.settingsBranches,
    cta: "Manage branches",
  },
  {
    key: "timezoneCurrencySet",
    label: "Timezone & currency",
    description: "Attendance times and fee ledgers follow these settings.",
    href: routes.portal.settingsPreferences,
    cta: "Set preferences",
  },
  {
    key: "academicYearSet",
    label: "Academic year",
    description: "Define the current academic year's start and end dates.",
    href: routes.portal.settingsAcademicYear,
    cta: "Set academic year",
  },
  {
    key: "staffOnboarded",
    label: "Invite your staff",
    description: "Bring managers and teachers in with role-based access.",
    href: routes.portal.settingsOnboarding,
    cta: "See onboarding options",
  },
  {
    key: "studentsOnboarded",
    label: "Add or import students",
    description: "Manual entry or validated CSV/Excel import — your choice.",
    href: routes.portal.settingsOnboarding,
    cta: "See onboarding options",
  },
];

/**
 * Guided but NON-BLOCKING setup: completion comes from backend metadata,
 * steps can be skipped and finished later, and the portal stays usable.
 * Hidden once everything is complete (Settings keeps full access).
 */
export function SetupChecklist() {
  const { currentOrganization } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: queryKeys.organization.setupStatus(orgId),
    queryFn: () => {
      if (!orgId) throw new Error("Setup query ran without an organization.");
      return getSetupStatus(orgId);
    },
    enabled: Boolean(orgId) && !dismissed,
  });

  if (!orgId || dismissed) return null;

  if (query.isPending) {
    return (
      <Card aria-label="Loading setup checklist">
        <CardBody className="flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardBody>
      </Card>
    );
  }
  // Checklist is advisory: a metadata failure must not break the dashboard.
  if (query.isError || !query.data) return null;

  const status = query.data;
  const remaining = ITEMS.filter((item) => !status[item.key]);
  if (remaining.length === 0) return null;

  const canManage =
    currentOrganization.role === "owner" ||
    currentOrganization.role === "general_manager";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            Getting started — {ITEMS.length - remaining.length} of {ITEMS.length} done
          </CardTitle>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-sm font-medium text-muted underline hover:text-text"
          >
            Skip for now
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Recommended next steps — nothing here blocks your portal; finish
          anytime from Settings.
        </p>
      </CardHeader>
      <CardBody>
        <ul className="flex flex-col divide-y divide-border">
          {ITEMS.map((item) => {
            const done = status[item.key];
            return (
              <li key={item.key} className="flex flex-wrap items-center gap-3 py-3">
                <Badge variant={done ? "success" : "warning"}>
                  {done ? "Done" : "Recommended"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted">{item.description}</p>
                </div>
                {!done && canManage ? (
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-primary underline"
                  >
                    {item.cta} →
                  </Link>
                ) : !done ? (
                  <span className="text-sm text-muted">Ask an owner/GM</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
