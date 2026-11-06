import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/**
 * Semantic table primitives. `Table` wraps in a horizontally scrollable
 * region so data tables stay usable on small screens (pages may switch to
 * card layouts where that reads better — see docs/design-system.md).
 * The scroll region is focusable + labelled when `aria-label` is passed.
 */
export function Table({
  className,
  containerClassName,
  "aria-label": ariaLabel,
  ...props
}: HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-lg border border-border", containerClassName)}
      tabIndex={ariaLabel ? 0 : undefined}
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
    >
      <table
        className={cn("w-full min-w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-raised", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableFooter({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("border-t border-border bg-surface-raised font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

/** Column header cell — defaults to scope="col". */
export function TableHead({
  className,
  scope = "col",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn(
        "px-4 py-3 text-left align-middle font-semibold text-text whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle text-text", className)} {...props} />
  );
}

export function TableCaption({
  className,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("px-4 py-3 text-left text-sm text-muted", className)}
      {...props}
    />
  );
}
