import { routes } from "@/lib/routes";
import type { PublishedPlan } from "@/api/services/plans";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatAmount(amount: number | null, unit: string): string {
  if (amount === null) return "Custom";
  return `${amount.toLocaleString("en-US")} ${unit}`;
}

/**
 * Renders one published plan exactly as returned by the API (minor units →
 * formatted via formatMoney with the plan's own currency). Custom-priced
 * plans never show a guessed number.
 */
export function PlanCard({ plan }: { plan: PublishedPlan }) {
  const priceMinor = plan.priceMinor;
  const isCustom = priceMinor === null;
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        plan.highlight && "border-primary shadow-md",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-h4">{plan.name}</h3>
          {plan.highlight ? <Badge variant="info">Most popular</Badge> : null}
        </div>
        {plan.tagline ? (
          <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
        ) : null}
        <p className="mt-4">
          {isCustom ? (
            <span className="text-h3 font-bold">Custom pricing</span>
          ) : (
            <>
              <span className="text-h2 font-bold">
                {formatMoney(priceMinor, plan.currency)}
              </span>
              {plan.billingPeriod ? (
                <span className="text-sm text-muted"> / {plan.billingPeriod}</span>
              ) : null}
            </>
          )}
        </p>
      </CardHeader>
      <CardBody className="flex-1">
        <h4 className="text-sm font-semibold">Included allowances</h4>
        <ul className="mt-3 space-y-2 text-sm">
          {plan.allowances.map((allowance) => (
            <li key={`${allowance.label}-${allowance.unit}`} className="flex justify-between gap-3">
              <span className="text-muted">{allowance.label}</span>
              <span className="text-right font-medium">
                {formatAmount(allowance.amount, allowance.unit)}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter>
        <Link
          href={routes.requestPilot}
          className={cn(
            "inline-flex min-h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium",
            plan.highlight
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "border border-border text-text hover:bg-surface-raised",
          )}
        >
          {isCustom ? "Talk to us" : "Request a pilot"}
        </Link>
      </CardFooter>
    </Card>
  );
}
