/**
 * Joins truthy class fragments. Intentionally dependency-free — if override
 * conflicts ever need resolution, evaluate tailwind-merge at that point.
 * Convention: component `className` props are appended LAST so callers can
 * extend (not silently fight) base styles.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
