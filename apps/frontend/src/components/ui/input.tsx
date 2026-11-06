import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Form control primitives. Always pair with <FormField> (label + description
 * + error wiring) or an explicit <label htmlFor>. `invalid` mirrors
 * aria-invalid so error styling never depends on colour alone in markup.
 */

const CONTROL_BASE =
  "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-text shadow-xs transition-all duration-150 " +
  "placeholder:text-faint hover:border-input-border " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-soft " +
  "disabled:cursor-not-allowed disabled:bg-disabled disabled:text-faint disabled:opacity-80";

function borderClass(invalid?: boolean) {
  return invalid ? "border-error focus:border-error focus:ring-error-surface" : "border-input-border";
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ref,
  ...props
}: InputProps) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid ?? ariaInvalid}
      className={cn(CONTROL_BASE, borderClass(invalid), className)}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ref,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid ?? ariaInvalid}
      className={cn(CONTROL_BASE, "min-h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9", borderClass(invalid), className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239296A8'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ref,
  ...props
}: TextareaProps) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid ?? ariaInvalid}
      className={cn(CONTROL_BASE, "min-h-24 resize-y", borderClass(invalid), className)}
      {...props}
    />
  );
}

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  ref?: Ref<HTMLInputElement>;
}

/** Use inside a <label> (or with FormField group labelling via fieldset). */
export function Checkbox({ className, ref, ...props }: CheckboxProps) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-input-border accent-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  ref?: Ref<HTMLInputElement>;
}

/** Group radios with <fieldset>/<legend> so the group has an accessible name. */
export function Radio({ className, ref, ...props }: RadioProps) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer border-input-border accent-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** Accessible switch (role="switch", keyboard operable via a button). */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {description ? <p className="mt-0.5 text-caption text-faint">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft",
          checked ? "border-primary bg-primary" : "border-input-border bg-surface-subtle",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[1.35rem]" : "translate-x-[0.2rem]",
          )}
        />
      </button>
    </div>
  );
}

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  shortcut?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Search field with a leading icon and an optional keyboard-shortcut hint. */
export function SearchInput({
  shortcut,
  wrapperClassName,
  className,
  ref,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        fill="currentColor"
      >
        <path d="M9 3a6 6 0 1 0 3.6 10.8l3.3 3.3 1.1-1.1-3.3-3.3A6 6 0 0 0 9 3Zm0 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
      </svg>
      <input
        ref={ref}
        type="search"
        className={cn(CONTROL_BASE, "border-input-border pl-9 pr-16", className)}
        {...props}
      />
      {shortcut ? (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-caption font-medium text-faint sm:inline-flex">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
}

/** Small inline icon used in field prefixes. */
export function InputIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
      {children}
    </span>
  );
}
