"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

/** Accessible tab list (manual activation via buttons). */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-raised p-1", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all duration-150",
              active
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:bg-surface/60 hover:text-text",
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-caption font-semibold",
                  active ? "bg-primary-soft text-primary" : "bg-surface-subtle text-faint",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface CrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: CrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 text-caption text-faint", className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3" fill="currentColor">
              <path d="M7.5 4.5 13 10l-5.5 5.5-1-1L11 10 6.5 5.5l1-1Z" />
            </svg>
          ) : null}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-text">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text-secondary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-caption text-faint">
        Showing <span className="font-medium text-text-secondary">{from.toLocaleString()}–{to.toLocaleString()}</span> of{" "}
        <span className="font-medium text-text-secondary">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M12.5 4.5 7 10l5.5 5.5 1-1L9 10l4.5-4.5-1-1Z" />
          </svg>
          Previous
        </button>
        <span className="px-1 text-caption text-faint">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-50"
        >
          Next
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M7.5 4.5 13 10l-5.5 5.5-1-1L11 10 6.5 5.5l1-1Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
