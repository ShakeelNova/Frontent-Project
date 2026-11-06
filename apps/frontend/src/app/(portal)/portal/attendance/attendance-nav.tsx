"use client";

import { routes } from "@/lib/routes";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: routes.portal.attendanceStudents, label: "Student attendance" },
  { href: routes.portal.attendanceQr, label: "QR check-in" },
  { href: routes.portal.attendanceStaff, label: "Staff attendance" },
  { href: routes.portal.attendanceRequests, label: "Corrections & leave" },
];

export function AttendanceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Attendance sections" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (pathname === "/portal/attendance" && item.href.endsWith("/students"));
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
