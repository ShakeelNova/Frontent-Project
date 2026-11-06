import { Spinner } from "./spinner";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "subtle"
  | "ghost"
  | "soft"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables interaction, and announces busy state. */
  isLoading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-glow hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-secondary text-white shadow-sm hover:bg-secondary-hover active:bg-secondary",
  subtle:
    "border border-border bg-surface text-text shadow-xs hover:border-input-border hover:bg-surface-raised",
  ghost:
    "text-text-secondary hover:bg-surface-raised hover:text-text",
  soft:
    "bg-primary-soft text-primary hover:bg-primary-soft-hover",
  destructive:
    "bg-error text-white shadow-sm hover:bg-error-hover",
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-8 gap-1.5 rounded-lg px-3 text-caption",
  md: "min-h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "min-h-11 gap-2 rounded-xl px-5 text-sm",
  icon: "h-9 w-9 rounded-lg",
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
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft",
        "disabled:pointer-events-none disabled:opacity-55",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner className="h-4 w-4" /> : null}
      {isLoading ? <span className="sr-only">Loading…</span> : null}
      <span aria-hidden={isLoading || undefined} className="inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  ref?: Ref<HTMLButtonElement>;
}

/** Square icon-only control. `label` becomes the accessible name + tooltip. */
export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ref,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft",
        "disabled:pointer-events-none disabled:opacity-55",
        BUTTON_VARIANTS[variant],
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
