import { extractFieldErrors } from "@/api/errors";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Applies backend field-level validation errors onto a React Hook Form
 * instance. Returns true when at least one field error was applied (so the
 * caller can skip a duplicate generic alert, or keep both — caller's call).
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  const fieldErrors = extractFieldErrors(error);
  const entries = Object.entries(fieldErrors);
  for (const [field, message] of entries) {
    setError(field as Path<T>, { type: "server", message });
  }
  return entries.length > 0;
}
