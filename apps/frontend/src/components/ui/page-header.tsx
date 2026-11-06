import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent page header: optional breadcrumb trail, eyebrow, title,
 * description and primary/secondary actions. Used by every module page.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-caption text-faint">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3" fill="currentColor">
                  <path d="M7.5 4.5 13 10l-5.5 5.5-1-1L11 10 6.5 5.5l1-1Z" />
                </svg>
              ) : null}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-text">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-text-secondary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-h2 font-bold tracking-[-0.03em] text-text sm:text-h1">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
