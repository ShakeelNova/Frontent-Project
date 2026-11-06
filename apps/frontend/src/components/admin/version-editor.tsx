"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createPlanDraft,
  getPlanVersion,
  listAuditEvents,
  listPlanVersions,
  listPlans,
  listResourceDefinitions,
  transitionPlanVersion,
  updatePlanDraft,
  type PlanVersion,
  type PlanVersionInput,
  type ResourceDefinition,
  type VersionAction,
} from "@/api/services/admin-catalog";
import { VersionStatusBadge } from "@/components/admin/badges";
import { ErrorState } from "@/components/feedback/error-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
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
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  basePrice: z
    .string()
    .refine((v) => v.trim() === "" || parseMajorToMinor(v, "USD") !== null, {
      message: "Enter a valid amount like 49 or 49.50, or leave empty for custom pricing.",
    }),
  billingPeriod: z.enum(["month", "year"]),
  isHighlighted: z.boolean(),
  allowances: z.record(
    z.string(),
    z.object({
      included: z.boolean(),
      amount: z
        .string()
        .refine((v) => v.trim() === "" || /^\d+$/.test(v.trim()), {
          message: "Whole number, or empty for custom.",
        }),
    }),
  ),
  entitlements: z.record(z.string(), z.boolean()),
});

type FormValues = z.infer<typeof formSchema>;

function toFormValues(version: PlanVersion, resources: ResourceDefinition[]): FormValues {
  const allowances: FormValues["allowances"] = {};
  for (const def of resources) {
    const entry = version.allowances.find((a) => a.resourceKey === def.key);
    allowances[def.key] = {
      included: Boolean(entry),
      amount: entry ? (entry.amount === null ? "" : String(entry.amount)) : "",
    };
  }
  return {
    basePrice:
      version.basePriceMinor === null
        ? ""
        : minorToMajorInput(version.basePriceMinor, version.currency),
    billingPeriod: version.billingPeriod,
    isHighlighted: version.isHighlighted,
    allowances,
    entitlements: Object.fromEntries(version.entitlements.map((e) => [e.key, e.enabled])),
  };
}

/** Editable form — rendered ONLY for drafts (backend enforces the same). */
function DraftForm({
  planId,
  version,
  resources,
}: {
  planId: string;
  version: PlanVersion;
  resources: ResourceDefinition[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(version, resources),
  });

  const mutation = useMutation({
    mutationFn: (input: PlanVersionInput) => updatePlanDraft(planId, version.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });
      toast({ title: "Draft saved", variant: "success" });
    },
    onError: (error) => {
      applyApiFieldErrors(error, setError);
      toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" });
    },
  });

  const onSubmit = handleSubmit((values) => {
    const input: PlanVersionInput = {
      basePriceMinor:
        values.basePrice.trim() === "" ? null : parseMajorToMinor(values.basePrice, "USD"),
      billingPeriod: values.billingPeriod,
      isHighlighted: values.isHighlighted,
      allowances: resources
        .filter((def) => values.allowances[def.key]?.included)
        .map((def) => {
          const raw = values.allowances[def.key]?.amount.trim() ?? "";
          return { resourceKey: def.key, amount: raw === "" ? null : Number(raw) };
        }),
      entitlements: version.entitlements.map((e) => ({
        key: e.key,
        label: e.label,
        enabled: Boolean(values.entitlements[e.key]),
      })),
    };
    mutation.mutate(input);
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Base price (USD)"
          error={errors.basePrice?.message}
          description="Catalogue currency is USD. Leave empty for custom pricing."
        >
          <Input inputMode="decimal" placeholder="e.g. 49.00" {...register("basePrice")} />
        </FormField>
        <FormField label="Billing period">
          <Select {...register("billingPeriod")}>
            <option value="month">Per month</option>
            <option value="year">Per year</option>
          </Select>
        </FormField>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4" {...register("isHighlighted")} />
            Highlight on public pricing
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Included allowances</legend>
        <p className="mt-1 text-caption text-muted">
          Tick a resource to include it. Empty amount = custom/unlimited.
          Amounts are counted in the resource&apos;s own unit — credits are
          internal units, not money.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {resources.map((def) => {
            const fieldError = errors.allowances?.[def.key]?.amount?.message;
            const disabled = def.availability === "not_enabled";
            return (
              <div
                key={def.key}
                className="grid grid-cols-[1fr_10rem] items-start gap-3 rounded-md border border-border px-3 py-2 sm:grid-cols-[1fr_12rem]"
              >
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    disabled={disabled}
                    {...register(`allowances.${def.key}.included`)}
                  />
                  <span>
                    <span className="font-medium">{def.name}</span>
                    <span className="block text-caption text-muted">
                      {disabled ? "Not enabled — can't be sold yet. " : ""}
                      {def.description}
                    </span>
                  </span>
                </label>
                <span>
                  <Input
                    inputMode="numeric"
                    placeholder="Custom"
                    disabled={disabled}
                    aria-label={`${def.name} amount (${def.unitLabel})`}
                    {...register(`allowances.${def.key}.amount`)}
                  />
                  <span className="mt-1 block text-caption text-muted">{def.unitLabel}</span>
                  {fieldError ? (
                    <span className="block text-caption text-error">{fieldError}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Entitlements & feature flags</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {version.entitlements.map((e) => (
            <label key={e.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register(`entitlements.${e.key}`)} />
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Save draft
        </Button>
      </div>
    </form>
  );
}

function ReadOnlyDetails({ version, resources }: { version: PlanVersion; resources: ResourceDefinition[] }) {
  const defByKey = new Map(resources.map((r) => [r.key, r]));
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Base price</dt>
          <dd className="font-medium">
            {version.basePriceMinor === null
              ? "Custom pricing"
              : `${formatMoney(version.basePriceMinor, version.currency)} / ${version.billingPeriod}`}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Highlighted on pricing</dt>
          <dd className="font-medium">{version.isHighlighted ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-muted">Effective from</dt>
          <dd className="font-medium">
            {version.effectiveFromUtc ? formatPlainDate(version.effectiveFromUtc.slice(0, 10)) : "—"}
          </dd>
        </div>
      </dl>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Allowance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {version.allowances.map((a) => (
            <TableRow key={a.resourceKey}>
              <TableCell className="font-medium">{defByKey.get(a.resourceKey)?.name ?? a.resourceKey}</TableCell>
              <TableCell>
                {a.amount === null
                  ? "Custom"
                  : `${a.amount.toLocaleString()} ${defByKey.get(a.resourceKey)?.unitLabel ?? ""}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm">
        <span className="text-muted">Entitlements: </span>
        {version.entitlements.filter((e) => e.enabled).map((e) => e.label).join(" · ") || "None"}
      </p>
    </div>
  );
}

const ACTION_LABELS: Record<VersionAction, string> = {
  preview: "Move to preview",
  approve: "Approve",
  publish: "Publish",
  retire: "Retire",
  return_to_draft: "Return to draft",
};

function actionsFor(status: PlanVersion["status"]): VersionAction[] {
  switch (status) {
    case "draft":
      return ["preview"];
    case "preview":
      return ["approve", "return_to_draft"];
    case "approved":
      return ["publish", "return_to_draft"];
    case "published":
      return ["retire"];
    default:
      return [];
  }
}

export function VersionEditor({ planId, versionId }: { planId: string; versionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<VersionAction | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");

  const plansQuery = useQuery({ queryKey: queryKeys.admin.plans, queryFn: listPlans });
  const versionQuery = useQuery({
    queryKey: queryKeys.admin.planVersion(planId, versionId),
    queryFn: () => getPlanVersion(planId, versionId),
  });
  const versionsQuery = useQuery({
    queryKey: queryKeys.admin.planVersions(planId),
    queryFn: () => listPlanVersions(planId),
  });
  const resourcesQuery = useQuery({
    queryKey: queryKeys.admin.resources,
    queryFn: listResourceDefinitions,
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.admin.auditForEntity(versionId),
    queryFn: () => listAuditEvents({ entityId: versionId }),
  });

  const transitionMutation = useMutation({
    mutationFn: (action: VersionAction) =>
      transitionPlanVersion(
        planId,
        versionId,
        action,
        action === "publish" && effectiveDate
          ? { effectiveFromUtc: `${effectiveDate}T00:00:00Z` }
          : undefined,
      ),
    onSuccess: async (_data, action) => {
      setPendingAction(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });
      toast({
        title: action === "publish" ? "Version published" : "Status updated",
        description:
          action === "publish"
            ? "Public pricing now shows this version. Existing subscriptions keep their snapshots."
            : undefined,
        variant: "success",
      });
    },
    onError: (error) => {
      setPendingAction(null);
      toast({ title: normalizeApiError(error).friendlyTitle, description: normalizeApiError(error).friendlyDescription, variant: "error" });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: () => createPlanDraft(planId, versionId),
    onSuccess: (draft) => router.push(routes.admin.planVersion(planId, draft.id)),
    onError: (error) => toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" }),
  });

  if (versionQuery.isLoading || resourcesQuery.isLoading || versionsQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (versionQuery.isError) {
    return <ErrorState error={versionQuery.error} onRetry={() => versionQuery.refetch()} />;
  }
  const version = versionQuery.data!;
  const resources = resourcesQuery.data ?? [];
  const planName = plansQuery.data?.find((p) => p.id === planId)?.name ?? planId;
  const published = (versionsQuery.data ?? []).find((v) => v.status === "published");
  const isDraft = version.status === "draft";
  const defByKey = new Map(resources.map((r) => [r.key, r]));

  const impactRows: { label: string; before: string; after: string; change: string }[] = [];
  if (published && published.id !== version.id) {
    const fmtPrice = (v: PlanVersion) =>
      v.basePriceMinor === null ? "Custom" : `${formatMoney(v.basePriceMinor, v.currency)}/${v.billingPeriod}`;
    impactRows.push({
      label: "Base price",
      before: fmtPrice(published),
      after: fmtPrice(version),
      change:
        published.basePriceMinor === null || version.basePriceMinor === null
          ? "—"
          : version.basePriceMinor === published.basePriceMinor
            ? "No change"
            : `${version.basePriceMinor > published.basePriceMinor ? "+" : "−"}${formatMoney(Math.abs(version.basePriceMinor - published.basePriceMinor), version.currency)}`,
    });
    const keys = new Set([
      ...published.allowances.map((a) => a.resourceKey),
      ...version.allowances.map((a) => a.resourceKey),
    ]);
    for (const key of keys) {
      const before = published.allowances.find((a) => a.resourceKey === key)?.amount;
      const after = version.allowances.find((a) => a.resourceKey === key)?.amount;
      const fmt = (n: number | null | undefined) =>
        n === undefined ? "Not included" : n === null ? "Custom" : n.toLocaleString();
      impactRows.push({
        label: defByKey.get(key)?.name ?? key,
        before: fmt(before),
        after: fmt(after),
        change:
          typeof before === "number" && typeof after === "number"
            ? after === before
              ? "No change"
              : `${after > before ? "+" : "−"}${Math.abs(after - before).toLocaleString()}`
            : "—",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">
          <Link href={routes.admin.plan(planId)} className="font-medium text-primary underline">
            ← {planName} versions
          </Link>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1>
            {planName} v{version.versionNumber}
          </h1>
          <VersionStatusBadge status={version.status} />
        </div>
        <p className="mt-1 text-muted">
          Created by {version.createdByLabel} · last updated{" "}
          {formatPlainDate(version.updatedAtUtc.slice(0, 10))} by {version.updatedByLabel}
        </p>
      </div>

      {version.status === "published" || version.status === "retired" ? (
        <Alert variant="info" title="Immutable snapshot">
          {version.status === "published"
            ? "This is the live catalogue version. Subscriptions sold on it keep this exact price and allowances — to change anything, clone it into a new draft."
            : "This version is retired. Subscriptions sold on it still run on this snapshot until they are moved by an admin."}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted">
            Draft → preview → approved → published. Publishing updates the
            public pricing page and retires the previous published version;
            it never alters existing subscriptions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actionsFor(version.status).map((action) => (
              <Button
                key={action}
                variant={action === "publish" || action === "approve" ? "primary" : action === "retire" ? "destructive" : "subtle"}
                onClick={() => setPendingAction(action)}
                disabled={transitionMutation.isPending}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
            <Button variant="subtle" isLoading={cloneMutation.isPending} onClick={() => cloneMutation.mutate()}>
              Clone to new draft
            </Button>
          </div>
          {version.status === "approved" ? (
            <div className="mt-3 max-w-64">
              <FormField label="Publish effective date" description="Optional — leave empty to publish immediately.">
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </FormField>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isDraft ? "Edit draft" : "Version details"}</CardTitle>
        </CardHeader>
        <CardBody>
          {isDraft ? (
            <DraftForm key={version.updatedAtUtc} planId={planId} version={version} resources={resources} />
          ) : (
            <ReadOnlyDetails version={version} resources={resources} />
          )}
        </CardBody>
      </Card>

      {published && published.id !== version.id ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Impact vs published {planName} v{published.versionNumber}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Published v{published.versionNumber}</TableHead>
                  <TableHead>This v{version.versionNumber}</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{row.before}</TableCell>
                    <TableCell>{row.after}</TableCell>
                    <TableCell>{row.change}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-caption text-muted">
              New sign-ups see the new version once published. Existing
              subscriptions are unaffected.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Audit history for this version</CardTitle>
        </CardHeader>
        <CardBody>
          {auditQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !auditQuery.data || auditQuery.data.length === 0 ? (
            <p className="text-sm text-muted">No recorded changes for this version yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {auditQuery.data.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="text-muted">{formatPlainDate(e.occurredAtUtc.slice(0, 10))}</span> ·{" "}
                  <span className="font-medium">{e.actorLabel}</span> · {e.summary}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction === "publish"
            ? `Publish ${planName} v${version.versionNumber}?`
            : pendingAction === "retire"
              ? `Retire ${planName} v${version.versionNumber}?`
              : pendingAction === "approve"
                ? `Approve ${planName} v${version.versionNumber}?`
                : `${pendingAction ? ACTION_LABELS[pendingAction] : ""} ${planName} v${version.versionNumber}?`
        }
        description={
          pendingAction === "publish"
            ? "This becomes the live catalogue version: public pricing updates immediately and the previous published version retires. Existing subscriptions keep their snapshots and are not changed."
            : pendingAction === "retire"
              ? "The plan will have no published version until another is published, and it disappears from public pricing. Subscriptions on this snapshot keep running."
              : pendingAction === "approve"
                ? "Approval locks this version's content. It can then be published (immediately or scheduled)."
                : pendingAction === "return_to_draft"
                  ? "The version becomes an editable draft again. It must pass preview and approval before publishing."
                  : "The version moves to preview, where its impact against the published version can be reviewed before approval."
        }
        confirmLabel={pendingAction ? ACTION_LABELS[pendingAction] : "Confirm"}
        variant={pendingAction === "retire" ? "destructive" : "primary"}
        isConfirming={transitionMutation.isPending}
        onConfirm={() => pendingAction && transitionMutation.mutate(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
