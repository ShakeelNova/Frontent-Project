import { BrandMark, Icon } from "@/components/ui/icon";
import type { ReactNode } from "react";

export interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const HIGHLIGHTS = [
  "One workspace for students, staff, attendance and fees",
  "Role-based access for owners, managers, teachers and parents",
  "Multi-branch visibility with drill-downs that respect scope",
];

/**
 * Split-screen authentication chrome shared by all /auth/* pages.
 * Left: premium brand panel. Right: the form. On mobile the brand panel
 * collapses to a compact header so the form is immediately reachable.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden bg-primary p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-secondary/40 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-9 w-9 ring-1 ring-white/20" />
              <span className="text-base font-bold tracking-[-0.02em]">Fluxeaze</span>
            </div>
            <h2 className="mt-10 max-w-sm text-h2 font-bold leading-[1.15] tracking-[-0.03em]">
              The calm way to run your institution.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              Attendance, students, staff, fees and decisions — in one beautifully
              simple workspace.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/90">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-white/70">This week</p>
                <p className="mt-0.5 text-h4 font-bold tracking-tight">94.2%</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-caption font-semibold">
                <Icon name="activity" className="h-3 w-3" /> Live
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1.5" aria-hidden="true">
              {[38, 52, 44, 66, 58, 78, 88].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-md bg-white/30"
                  style={{ height: `${height * 0.5}px` }}
                />
              ))}
            </div>
            <p className="mt-2 text-caption text-white/60">Attendance overview · all branches</p>
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <BrandMark className="h-9 w-9" />
              <span className="text-base font-bold tracking-[-0.02em] text-text">Fluxeaze</span>
            </div>
            <h1 className="text-h3 font-bold tracking-[-0.03em] text-text">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
            <div className="mt-7">{children}</div>
            {footer ? (
              <div className="mt-6 border-t border-border pt-5 text-sm text-muted">{footer}</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
