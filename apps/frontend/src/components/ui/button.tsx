import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export type ButtonVariant = "primary" | "secondary" | "subtle" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables interaction, and announces busy state. */
  isLoading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm",
  subtle:
    "bg-transparent text-text border border-border hover:bg-surface-raised",
  destructive: "bg-error text-white hover:opacity-90 shadow-sm",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 text-sm gap-1.5",
  md: "min-h-10 px-4 text-sm gap-2",
  lg: "min-h-11 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  type = "button",
  className,
  children,
  ref,
  ...props
}: ButtonProps & { children: ReactNode }) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-opacity",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner className="h-4 w-4" /> : null}
      {isLoading ? <span className="sr-only">Loading…</span> : null}
      <span aria-hidden={isLoading || undefined}>{children}</span>
    </button>
  );
}
