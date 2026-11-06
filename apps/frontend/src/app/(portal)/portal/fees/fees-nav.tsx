"use client";

import { routes } from "@/lib/routes";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: routes.portal.fees, label: "Overview & reports" },
  { href: routes.portal.feesStructures, label: "Fee structures" },
  { href: routes.portal.feesVouchers, label: "Vouchers" },
];

export function FeesNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Fees sections" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          item.href === "/portal/fees"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
