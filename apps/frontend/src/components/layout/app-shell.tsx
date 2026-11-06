"use client";

import { PageTransition } from "@/components/motion/reveal";
import { ThemeToggle } from "@/components/theme/theme";
import { Avatar } from "@/components/ui/avatar";
import { BrandMark, Icon, type IconName } from "@/components/ui/icon";
import { CommandPalette, NotificationMenu, ProfileMenu, type CommandItem, type NotificationItem } from "@/components/ui/menus";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export interface AppNavItem {
  label: string;
  href: string;
  icon?: IconName;
  badge?: string;
  /** Exact match instead of prefix match (for /portal). */
  exact?: boolean;
}

export interface AppNavSection {
  heading: string;
  items: AppNavItem[];
}

export interface AppShellUser {
  name: string;
  email: string;
  role?: string;
}

export interface AppShellProps {
  sections: AppNavSection[];
  user?: AppShellUser | null;
  onSignOut?: () => void;
  isSigningOut?: boolean;
  settingsHref?: string;
  helpHref?: string;
  topbarLeading?: ReactNode;
  sidebarContext?: ReactNode;
  notifications?: NotificationItem[];
  commandItems?: CommandItem[];
  brandSubtitle?: string;
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "fluxeaze-sidebar-collapsed";
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void): () => void {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function isActive(pathname: string, item: AppNavItem): boolean {
  if (item.exact || item.href === "/portal" || item.href === "/student" || item.href === "/admin") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Premium application shell: collapsible white sidebar, sticky top bar with
 * command search, notifications and profile, responsive mobile drawer, and
 * shared motion. Used by the organization portal, student/parent area and
 * platform admin so the whole product feels like one system.
 */
export function AppShell({
  sections,
  user,
  onSignOut,
  isSigningOut,
  settingsHref,
  helpHref,
  topbarLeading,
  sidebarContext,
  notifications = [],
  commandItems = [],
  brandSubtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    const next = !getCollapsedSnapshot();
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    collapsedListeners.forEach((listener) => listener());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const paletteItems = useMemo<CommandItem[]>(() => {
    const navItems = sections.flatMap((section) =>
      section.items.map((item) => ({
        label: item.label,
        href: item.href,
        group: section.heading,
        icon: item.icon ? <Icon name={item.icon} className="h-4 w-4" /> : undefined,
      })),
    );
    return [...navItems, ...commandItems];
  }, [sections, commandItems]);

  const navLink = (item: AppNavItem, onNavigate?: () => void) => {
    const active = isActive(pathname, item);
    const content = (
      <>
        {active ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          />
        ) : null}
        {item.icon ? (
          <Icon
            name={item.icon}
            className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary" : "text-faint")}
          />
        ) : null}
        <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
        {item.badge ? (
          <span
            className={cn(
              "rounded-full bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary",
              collapsed && "hidden",
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </>
    );

    const className = cn(
      "relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150",
      active
        ? "bg-primary-soft text-primary"
        : "text-text-secondary hover:bg-surface-raised hover:text-text",
      collapsed && "justify-center px-0",
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} label={item.label} side="right">
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className={className}
          >
            {content}
          </Link>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  };

  const sidebarInner = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 px-4 py-4", collapsed && "justify-center px-0")}>
        <BrandMark className="h-9 w-9 shrink-0" />
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <p className="truncate text-sm font-bold tracking-[-0.02em] text-text">Fluxeaze</p>
          <p className="truncate text-caption text-faint">{brandSubtitle ?? "Education Operations"}</p>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-raised hover:text-text lg:inline-flex",
            collapsed && "lg:hidden",
          )}
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
      </div>

      {collapsed ? (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-raised hover:text-text"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {sidebarContext ? (
        <div className={cn("px-3 pb-1", collapsed && "hidden")}>{sidebarContext}</div>
      ) : null}

      <nav aria-label="Primary" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {sections.map((section) => (
          <div key={section.heading} className="mb-4">
            {!collapsed ? (
              <p className="px-3 pb-1.5 pt-2 text-caption font-semibold uppercase tracking-[0.12em] text-faint">
                {section.heading}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-8 bg-border" />
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>{navLink(item, onNavigate)}</li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-border p-3", collapsed && "px-2")}>
        {helpHref ? (
          <Link
            href={helpHref}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-surface-raised px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text",
              collapsed && "justify-center px-0",
            )}
            aria-label="Help and onboarding"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary shadow-sm">
              <Icon name="help" className="h-4 w-4" />
            </span>
            <span className={cn("min-w-0", collapsed && "sr-only")}>
              <span className="block text-sm font-medium text-text">Help &amp; onboarding</span>
              <span className="block text-caption text-faint">Guides and next steps</span>
            </span>
          </Link>
        ) : null}
        {!collapsed ? (
          <p className="mt-3 px-1 text-center text-caption text-faint">Fluxeaze · v1.0</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {sidebarInner()}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-72 border-r border-border bg-surface shadow-xl"
              initial={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              aria-label="Mobile navigation"
            >
              {sidebarInner(() => setMobileOpen(false))}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="flex min-h-16 items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 text-left text-sm text-faint transition-colors hover:border-input-border hover:bg-surface-subtle md:flex"
            >
              <Icon name="search" className="h-4 w-4" />
              <span className="flex-1 truncate">Search anything…</span>
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-caption font-medium text-faint">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text md:hidden"
            >
              <Icon name="search" className="h-4.5 w-4.5" />
            </button>

            {topbarLeading ? <div className="hidden min-w-0 items-center gap-2 md:flex">{topbarLeading}</div> : null}

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <ThemeToggle />
              <NotificationMenu items={notifications} />
              {user ? (
                <ProfileMenu
                  user={user}
                  onSignOut={() => onSignOut?.()}
                  settingsHref={settingsHref}
                  isSigningOut={isSigningOut}
                />
              ) : (
                <Avatar name="Guest" size="sm" tone="neutral" />
              )}
            </div>
          </div>
          {topbarLeading ? (
            <div className="border-t border-border px-4 py-2 md:hidden">{topbarLeading}</div>
          ) : null}
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>

      <CommandPalette key={paletteOpen ? "open" : "closed"} open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}
