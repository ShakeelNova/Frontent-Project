import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Drill-down target (feature page with filters applied). */
  href?: string;
}

export function MetricCard({ label, value, hint, href }: MetricCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      hint={hint}
      href={href}
      icon={<Icon name="activity" className="h-5 w-5" />}
    />
  );
}
