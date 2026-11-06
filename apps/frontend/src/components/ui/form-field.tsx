"use client";

import { cn } from "@/lib/utils";
import {
  cloneElement,
  useId,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-text", className)} {...props} />
  );
}

export interface FormFieldProps {
  /** Control id. Generated when omitted. */
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  /** Field-level error (validation). Sets aria-invalid + role="alert" text. */
  error?: string;
  required?: boolean;
  className?: string;
  /** Exactly one form control (Input/Select/Textarea/…). */
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    invalid?: boolean;
    required?: boolean;
  }>;
}

/**
 * Wires label ↔ control association and describedby (description + error)
 * so individual forms cannot forget accessibility plumbing:
 *
 * <FormField label="Email" error={errors.email}>
 *   <Input type="email" autoComplete="email" />
 * </FormField>
 */
export function FormField({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId().replace(/[:]/g, "");
  const fieldId = id ?? children.props.id ?? `field-${generatedId}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const describedBy =
    [children.props["aria-describedby"], descriptionId, errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = cloneElement(children, {
    id: fieldId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    invalid: error ? true : children.props.invalid,
    required: required ?? children.props.required,
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="text-error" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </Label>
      {control}
      {description ? (
        <p id={descriptionId} className="text-sm text-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
