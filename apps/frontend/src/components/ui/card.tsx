import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5", className)}
      {...props}
    />
  );
}

/** Card body (`CardContent` alias kept for shadcn-style familiarity). */
export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 sm:px-6 sm:py-5", className)} {...props} />;
}

export const CardContent = CardBody;

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h3 className={cn("text-h5 font-semibold tracking-[-0.01em]", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted", className)} {...props} />;
}

/** Soft tinted surface used for feature callouts inside cards. */
export function CardTint({
  tone = "purple",
  className,
  children,
}: {
  tone?: "purple" | "cyan" | "green" | "pink" | "cream";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    purple: "bg-primary-soft text-primary",
    cyan: "bg-cyan-soft text-info",
    green: "bg-green-soft text-success",
    pink: "bg-pink-soft text-pink",
    cream: "bg-cream text-warning",
  } as const;
  return (
    <div className={cn("rounded-xl p-4", tones[tone], className)}>{children}</div>
  );
}
