"use client";

import { routes } from "@/lib/routes";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: routes.portal.academicsYears, label: "Academic years" },
  { href: routes.portal.academicsPrograms, label: "Programs" },
  { href: routes.portal.academicsClasses, label: "Classes & batches" },
  { href: routes.portal.academicsSubjects, label: "Subjects" },
];

export function AcademicsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Academic structure sections" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (pathname === "/portal/academics" && item.href.endsWith("/years"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium",
              active
                ? "bg-primary text-primary-foreground"
                : "text-text hover:bg-surface-raised",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
