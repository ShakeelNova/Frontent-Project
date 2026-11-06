"use client";

import { routes } from "@/lib/routes";
import { ThemeToggle } from "@/components/theme/theme";
import { BrandMark, Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: routes.pricing },
  { label: "Request a pilot", href: routes.requestPilot },
];

export function PublicHeader() {
  const { user, signOut, isSigningOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <Link href={routes.home} className="flex shrink-0 items-center gap-2.5" aria-label="Fluxeaze home">
          <BrandMark className="h-8 w-8" />
          <span className="text-base font-bold tracking-[-0.02em] text-text">Fluxeaze</span>
        </Link>

        <nav aria-label="Public" className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : link.href.startsWith("/#")
                  ? false
                  : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-raised text-text" : "text-text-secondary hover:bg-surface-raised hover:text-text",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link
              href={user.isPlatformAdmin ? routes.admin.root : user.kind === "staff" ? routes.portal.root : routes.student.root}
              className="inline-flex min-h-9 items-center rounded-xl bg-primary px-3.5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
            >
              Open portal
            </Link>
          ) : (
            <>
              <Link
                href={routes.auth.signIn}
                className="hidden min-h-9 items-center rounded-xl px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href={routes.requestPilot}
                className="inline-flex min-h-9 items-center rounded-xl bg-primary px-3.5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
              >
                Request a pilot
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text md:hidden"
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text"
              >
                {link.label}
              </Link>
            ))}
            {!user ? (
              <Link
                href={routes.auth.signIn}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text"
              >
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await signOut().catch(() => undefined);
                  router.push(routes.auth.signIn);
                }}
                disabled={isSigningOut}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-error-surface disabled:opacity-60"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
