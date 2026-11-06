import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
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
  "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function borderClass(invalid?: boolean) {
  return invalid ? "border-error" : "border-border";
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
      className={cn(CONTROL_BASE, "min-h-10", borderClass(invalid), className)}
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
      className={cn(CONTROL_BASE, "min-h-24", borderClass(invalid), className)}
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
        "h-4 w-4 shrink-0 rounded-sm accent-(--color-primary) disabled:cursor-not-allowed disabled:opacity-60",
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
        "h-4 w-4 shrink-0 accent-(--color-primary) disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
