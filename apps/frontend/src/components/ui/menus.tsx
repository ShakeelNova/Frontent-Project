"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);
  return ref;
}

export interface ProfileMenuUser {
  name: string;
  email: string;
  role?: string;
}

/** Top-bar profile dropdown: identity, settings, sign out. */
export function ProfileMenu({
  user,
  onSignOut,
  settingsHref,
  isSigningOut,
}: {
  user: ProfileMenuUser;
  onSignOut: () => void;
  settingsHref?: string;
  isSigningOut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:border-border hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-32 truncate text-sm font-medium text-text">{user.name}</span>
          {user.role ? <span className="block max-w-32 truncate text-caption text-faint">{user.role}</span> : null}
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="hidden h-3.5 w-3.5 text-faint lg:block" fill="currentColor">
          <path d="M5.5 7.5 10 12l4.5-4.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl animate-scale-in"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-text">{user.name}</p>
            <p className="truncate text-caption text-faint">{user.email}</p>
            {user.role ? <p className="mt-1 text-caption font-medium text-primary">{user.role}</p> : null}
          </div>
          <div className="p-1.5">
            {settingsHref ? (
              <Link
                href={settingsHref}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                  <path d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                  <path d="M8.6 2h2.8l.4 1.6 1.3.7 1.6-.5 1.4 2.4-1.1 1.2v1.5l1.1 1.2-1.4 2.4-1.6-.5-1.3.7-.4 1.6H8.6l-.4-1.6-1.3-.7-1.6.5-1.4-2.4L5 10.9V9.4L3.9 8.2l1.4-2.4 1.6.5 1.3-.7L8.6 2Z" opacity=".35" />
                </svg>
                Account settings
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error transition-colors hover:bg-error-surface disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                <path d="M4 3h7v2H6v10h5v2H4V3Zm8.3 3.3 1.1 1.1L11.9 9H17v2h-5.1l1.5 1.6-1.1 1.1L8.6 10l3.7-3.7Z" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  href?: string;
  tone?: "purple" | "cyan" | "green" | "pink" | "amber";
}

/** Top-bar notifications dropdown with a real empty state. */
export function NotificationMenu({ items = [] }: { items?: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  const toneClass: Record<NonNullable<NotificationItem["tone"]>, string> = {
    purple: "bg-primary",
    cyan: "bg-cyan",
    green: "bg-green",
    pink: "bg-pink",
    amber: "bg-warning",
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor">
          <path d="M10 2a5 5 0 0 0-5 5v3.2L3.6 13a1 1 0 0 0 .8 1.5h11.2a1 1 0 0 0 .8-1.5L15 10.2V7a5 5 0 0 0-5-5Zm0 16a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 10 18Z" />
        </svg>
        {items.length > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pink ring-2 ring-surface" />
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Notifications</p>
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-caption font-medium text-faint">
              {items.length}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-soft text-success">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="currentColor">
                  <path d="M8.2 13.3 5 10.1l-1.1 1.1 4.3 4.3 8-8-1.1-1.1-6.9 6.9Z" />
                </svg>
              </span>
              <p className="text-sm font-medium text-text">You&apos;re all caught up</p>
              <p className="text-caption text-faint">New activity will appear here.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href ?? "#"}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-raised"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneClass[item.tone ?? "purple"])} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text">{item.title}</span>
                      {item.description ? <span className="mt-0.5 block text-caption text-faint">{item.description}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export interface CommandItem {
  label: string;
  href: string;
  group: string;
  icon?: ReactNode;
  keywords?: string;
}

/** Ctrl/Cmd+K command palette for fast navigation. */
export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = items.filter((item) => {
    const haystack = `${item.label} ${item.group} ${item.keywords ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const groups = [...new Set(filtered.map((item) => item.group))];

  return (
    <Dialog open={open} onClose={onClose} title="Search Fluxeaze" description="Jump to any page or action.">
      <div className="flex flex-col gap-3">
        <SearchInput
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages, students, settings…"
          aria-label="Search pages and actions"
        />
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">No results for “{query}”.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {groups.map((group) => (
              <div key={group} className="mb-3">
                <p className="px-2 pb-1 text-caption font-semibold uppercase tracking-[0.1em] text-faint">{group}</p>
                <ul>
                  {filtered
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <li key={`${item.group}-${item.label}-${item.href}`}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push(item.href);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text"
                        >
                          <span className="text-faint">{item.icon}</span>
                          {item.label}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-caption text-faint">Tip: press Ctrl / ⌘ + K anywhere</p>
          <Button variant="subtle" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
