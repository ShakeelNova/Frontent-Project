import { Card, CardBody } from "@/components/ui/card";
import Link from "next/link";

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Drill-down target (feature page with filters applied). */
  href?: string;
}

export function MetricCard({ label, value, hint, href }: MetricCardProps) {
  const body = (
    <CardBody>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-h3 font-bold">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      {href ? (
        <p className="mt-2 text-sm font-medium text-primary">View details →</p>
      ) : null}
    </CardBody>
  );
  if (href) {
    return (
      <Link href={href} aria-label={`${label}: ${value}. View details`} className="block h-full">
        <Card className="h-full transition-shadow hover:shadow-md">{body}</Card>
      </Link>
    );
  }
  return <Card className="h-full">{body}</Card>;
}
