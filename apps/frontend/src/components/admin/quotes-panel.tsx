"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createQuote,
  createQuoteRule,
  listAddons,
  listPlanVersions,
  listPlans,
  listQuoteRules,
  listQuotes,
  transitionQuote,
  updateQuoteRule,
  type EnterpriseQuote,
  type QuoteAction,
  type QuoteRule,
} from "@/api/services/admin-catalog";
import { QuoteStatusBadge } from "@/components/admin/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const QUOTE_NEXT: Partial<Record<EnterpriseQuote["status"], { action: QuoteAction; label: string }[]>> = {
  draft: [
    { action: "send", label: "Mark sent" },
    { action: "reject", label: "Reject" },
  ],
  sent: [
    { action: "accept", label: "Mark accepted" },
    { action: "reject", label: "Reject" },
  ],
  accepted: [{ action: "convert", label: "Convert to subscription" }],
};

/** Enterprise quotes + quote rules (platform-admin only). */
export function QuotesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [ruleTarget, setRuleTarget] = useState<QuoteRule | "new" | null>(null);
  const [pending, setPending] = useState<{ quote: EnterpriseQuote; action: QuoteAction; label: string } | null>(null);

  const quotesQuery = useQuery({ queryKey: queryKeys.admin.quotes, queryFn: listQuotes });
  const rulesQuery = useQuery({ queryKey: queryKeys.admin.quoteRules, queryFn: listQuoteRules });

  const transitionMutation = useMutation({
    mutationFn: (p: { id: string; action: QuoteAction }) => transitionQuote(p.id, p.action),
    onSuccess: async (_data, vars) => {
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });
      toast({
        title: vars.action === "convert" ? "Subscription activated" : "Quote updated",
        description:
          vars.action === "convert"
            ? "The organization now runs on the quoted plan-version snapshot."
            : undefined,
        variant: "success",
      });
    },
    onError: (error) => {
      setPending(null);
      toast({ title: normalizeApiError(error).friendlyTitle, description: normalizeApiError(error).friendlyDescription, variant: "error" });
    },
  });

  if (quotesQuery.isLoading || rulesQuery.isLoading) return <Skeleton className="h-80 w-full" />;
  if (quotesQuery.isError) return <ErrorState error={quotesQuery.error} onRetry={() => quotesQuery.refetch()} />;
  const quotes = quotesQuery.data ?? [];
  const rules = rulesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-muted">
            Quotes pin an exact plan-version snapshot. Converting an accepted
            quote activates a subscription on that snapshot — even if a
            newer version has since been published.
          </p>
          <Button onClick={() => setCreateOpen(true)}>New quote</Button>
        </div>

        {quotes.length === 0 ? (
          <EmptyState title="No quotes yet" description="Create a quote to propose an Enterprise or pilot offer." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan snapshot</TableHead>
                <TableHead>Add-ons</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Annual price</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    {q.organizationName}
                    <span className="block text-caption font-normal text-muted">{q.id}</span>
                  </TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={q.status} />
                    {q.convertedSubscriptionId ? (
                      <span className="block text-caption text-muted">{q.convertedSubscriptionId}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{q.planVersionLabel}</TableCell>
                  <TableCell>{q.addonNames.join(", ") || "—"}</TableCell>
                  <TableCell>{q.termsLabel}</TableCell>
                  <TableCell>{q.annualPriceMinor === null ? "Custom" : `${formatMoney(q.annualPriceMinor, q.currency)} / year`}</TableCell>
                  <TableCell>{formatPlainDate(q.updatedAtUtc.slice(0, 10))}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-3">
                      {(QUOTE_NEXT[q.status] ?? []).map((a) => (
                        <button
                          key={a.action}
                          type="button"
                          className="font-medium text-primary underline"
                          disabled={transitionMutation.isPending}
                          onClick={() => setPending({ quote: q, action: a.action, label: a.label })}
                        >
                          {a.label}
                        </button>
                      ))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-h5">Quote rules</h2>
          <Button variant="subtle" onClick={() => setRuleTarget("new")}>
            New rule
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{rule.name}</CardTitle>
                  <Badge variant={rule.isActive ? "success" : "default"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted">{rule.description}</p>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div>
                    <dt className="inline text-muted">When: </dt>
                    <dd className="inline font-medium">{rule.conditionLabel}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Offer: </dt>
                    <dd className="inline font-medium">{rule.formulaLabel}</dd>
                  </div>
                </dl>
                <p className="mt-3">
                  <button type="button" className="font-medium text-primary underline" onClick={() => setRuleTarget(rule)}>
                    Edit rule
                  </button>
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <CreateQuoteDialog
        key={createOpen ? "quote-open" : "quote-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => {
          setCreateOpen(false);
          await queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });
        }}
      />
      <QuoteRuleDialog
        key={ruleTarget === "new" ? "rule-new" : (ruleTarget?.id ?? "rule-closed")}
        target={ruleTarget}
        onClose={() => setRuleTarget(null)}
        onSaved={async () => {
          setRuleTarget(null);
          await queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        title={`${pending?.label ?? ""} — ${pending?.quote.organizationName ?? ""}?`}
        description={
          pending?.action === "convert"
            ? `This activates a live subscription on the ${pending.quote.planVersionLabel} snapshot exactly as quoted. The organization will see it under Billing & subscription.`
            : pending?.action === "reject"
              ? "The quote is closed as rejected. This is recorded in the audit history."
              : pending?.action === "accept"
                ? "Mark the customer's acceptance. Conversion to a subscription is a separate, explicit step."
                : "Mark this quote as sent to the customer."
        }
        confirmLabel={pending?.label ?? "Confirm"}
        variant={pending?.action === "reject" ? "destructive" : "primary"}
        isConfirming={transitionMutation.isPending}
        onConfirm={() => pending && transitionMutation.mutate({ id: pending.quote.id, action: pending.action })}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

const quoteSchema = z.object({
  organizationName: z.string().min(2, "Enter the customer organization."),
  organizationId: z.string().optional(),
  planId: z.string().min(1, "Choose a plan."),
  planVersionId: z.string().min(1, "Choose the version snapshot."),
  termsLabel: z.string().min(3, "Summarize the terms."),
  annualPrice: z
    .string()
    .refine((v) => v.trim() === "" || parseMajorToMinor(v, "USD") !== null, {
      message: "Valid USD amount, or empty for custom.",
    }),
  addonNames: z.record(z.string(), z.boolean()),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

function CreateQuoteDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const plansQuery = useQuery({ queryKey: queryKeys.admin.plans, queryFn: listPlans, enabled: open });
  const addonsQuery = useQuery({ queryKey: queryKeys.admin.addons, queryFn: listAddons, enabled: open });
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { addonNames: {} },
  });
  const planId = useWatch({ control, name: "planId" }) ?? "";
  const versionsQuery = useQuery({
    queryKey: queryKeys.admin.planVersions(planId),
    queryFn: () => listPlanVersions(planId),
    enabled: open && Boolean(planId),
  });
  const publishableAddons = (addonsQuery.data ?? []).filter((a) =>
    a.versions.some((v) => v.status === "published"),
  );

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: async () => {
      toast({ title: "Quote created", variant: "success" });
      await onSaved();
    },
    onError: (error) => {
      applyApiFieldErrors(error, setError);
      toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" });
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      organizationName: values.organizationName,
      organizationId: values.organizationId?.trim() ? values.organizationId.trim() : null,
      planId: values.planId,
      planVersionId: values.planVersionId,
      termsLabel: values.termsLabel,
      annualPriceMinor:
        values.annualPrice.trim() === "" ? null : parseMajorToMinor(values.annualPrice, "USD"),
      addonNames: publishableAddons.filter((a) => values.addonNames[a.name]).map((a) => a.name),
    });
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New enterprise quote"
      description="The quote pins the selected plan version as an immutable snapshot."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} onClick={onSubmit}>
            Create draft quote
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField label="Customer organization" required error={errors.organizationName?.message}>
          <Input placeholder="e.g. City Schools Group" {...register("organizationName")} />
        </FormField>
        <FormField
          label="Existing organization ID (optional)"
          description="Link when the customer already has a Fluxeaze organization — conversion activates it directly."
        >
          <Input placeholder="e.g. org-fresh" {...register("organizationId")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Plan" required error={errors.planId?.message}>
            <Select {...register("planId")}>
              <option value="">Choose a plan…</option>
              {(plansQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Version snapshot" required error={errors.planVersionId?.message}>
            <Select {...register("planVersionId")} disabled={!planId}>
              <option value="">Choose a version…</option>
              {(versionsQuery.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.status})
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Terms summary" required error={errors.termsLabel?.message}>
          <Input placeholder="e.g. Annual · net-30 invoicing" {...register("termsLabel")} />
        </FormField>
        <FormField label="Annual price (USD)" error={errors.annualPrice?.message} description="Empty = custom / to be scoped.">
          <Input inputMode="decimal" placeholder="e.g. 1188.00" {...register("annualPrice")} />
        </FormField>
        {publishableAddons.length > 0 ? (
          <fieldset>
            <legend className="text-sm font-semibold">Published add-ons to include</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {publishableAddons.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" {...register(`addonNames.${a.name}`)} />
                  {a.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </form>
    </Dialog>
  );
}

const ruleSchema = z.object({
  name: z.string().min(3, "Give the rule a name."),
  description: z.string().min(5, "Describe the rule."),
  conditionLabel: z.string().min(3, "State when it applies."),
  formulaLabel: z.string().min(3, "State how the offer is derived."),
  isActive: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

function QuoteRuleDialog({
  target,
  onClose,
  onSaved,
}: {
  target: QuoteRule | "new" | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const editing = target && target !== "new" ? target : null;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      conditionLabel: editing?.conditionLabel ?? "",
      formulaLabel: editing?.formulaLabel ?? "",
      isActive: editing?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RuleFormValues) =>
      editing ? updateQuoteRule(editing.id, values) : createQuoteRule(values),
    onSuccess: async () => {
      toast({ title: editing ? "Rule updated" : "Rule created", variant: "success" });
      await onSaved();
    },
    onError: (error) => {
      applyApiFieldErrors(error, setError);
      toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" });
    },
  });

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={editing ? `Edit rule — ${editing.name}` : "New quote rule"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
            {editing ? "Save rule" : "Create rule"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        <FormField label="Rule name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <FormField label="Description" required error={errors.description?.message}>
          <Textarea rows={2} {...register("description")} />
        </FormField>
        <FormField label="Applies when" required error={errors.conditionLabel?.message}>
          <Input placeholder="e.g. Active students > 5,000" {...register("conditionLabel")} />
        </FormField>
        <FormField label="Offer formula" required error={errors.formulaLabel?.message}>
          <Input placeholder="e.g. Scale base + branch-pack add-ons" {...register("formulaLabel")} />
        </FormField>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4" {...register("isActive")} />
          Rule is active
        </label>
      </form>
    </Dialog>
  );
}
