import { cn } from "@/lib/utils";

export type AvatarTone = "purple" | "cyan" | "green" | "pink" | "amber" | "neutral";

const TONES: Record<AvatarTone, string> = {
  purple: "bg-primary-soft text-primary",
  cyan: "bg-cyan-soft text-info",
  green: "bg-green-soft text-success",
  pink: "bg-pink-soft text-pink",
  amber: "bg-cream text-warning",
  neutral: "bg-surface-subtle text-muted",
};

const SIZES = {
  xs: "h-6 w-6 text-caption",
  sm: "h-8 w-8 text-caption",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
} as const;

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Initials avatar with a soft brand tint. */
export function Avatar({
  name,
  tone = "purple",
  size = "md",
  className,
}: {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
