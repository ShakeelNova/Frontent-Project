"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createAddon,
  createAddonDraft,
  listAddons,
  listPlans,
  listResourceDefinitions,
  transitionAddonVersion,
  updateAddonDraft,
  type Addon,
  type AddonDraftInput,
  type VersionAction,
} from "@/api/services/admin-catalog";
import { VersionStatusBadge } from "@/components/admin/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
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
import { applyApiFieldErrors } from "@/lib/forms";
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(3, "Give the add-on a name."),
  description: z.string().min(5, "Describe what it includes."),
  resourceKey: z.string().min(1, "Choose a resource."),
  price: z
    .string()
    .refine((v) => v.trim() === "" || parseMajorToMinor(v, "USD") !== null, {
      message: "Enter a valid USD amount, or leave empty for custom.",
    }),
  allowanceAmount: z
    .string()
    .refine((v) => v.trim() === "" || /^\d+$/.test(v.trim()), {
      message: "Whole number, or empty for custom.",
    }),
  linkedPlanIds: z.record(z.string(), z.boolean()),
});

type FormValues = z.infer<typeof formSchema>;

type EditorTarget =
  | { mode: "create" }
  | { mode: "edit"; addon: Addon; versionId: string }
  | null;

const NEXT_ACTIONS: Partial<Record<string, { action: VersionAction; label: string }[]>> = {
  draft: [{ action: "preview", label: "To preview" }],
  preview: [
    { action: "approve", label: "Approve" },
    { action: "return_to_draft", label: "Back to draft" },
  ],
  approved: [
    { action: "publish", label: "Publish" },
    { action: "return_to_draft", label: "Back to draft" },
  ],
  published: [{ action: "retire", label: "Retire" }],
};

/** Add-on catalogue: draft editing, plan linking, versioned publishing. */
export function AddonsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorTarget>(null);
  const [pending, setPending] = useState<{ addonId: string; versionId: string; action: VersionAction; label: string } | null>(null);

  const addonsQuery = useQuery({ queryKey: queryKeys.admin.addons, queryFn: listAddons });
  const plansQuery = useQuery({ queryKey: queryKeys.admin.plans, queryFn: listPlans });
  const resourcesQuery = useQuery({ queryKey: queryKeys.admin.resources, queryFn: listResourceDefinitions });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.root });

  const transitionMutation = useMutation({
    mutationFn: (p: { addonId: string; versionId: string; action: VersionAction }) =>
      transitionAddonVersion(p.addonId, p.versionId, p.action),
    onSuccess: async () => {
      setPending(null);
      await invalidate();
      toast({ title: "Add-on updated", variant: "success" });
    },
    onError: (error) => {
      setPending(null);
      toast({ title: normalizeApiError(error).friendlyTitle, description: normalizeApiError(error).friendlyDescription, variant: "error" });
    },
  });

  const draftMutation = useMutation({
    mutationFn: (addonId: string) => createAddonDraft(addonId),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "New draft created", variant: "success" });
    },
    onError: (error) => toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" }),
  });

  if (addonsQuery.isLoading || plansQuery.isLoading || resourcesQuery.isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }
  if (addonsQuery.isError) {
    return <ErrorState error={addonsQuery.error} onRetry={() => addonsQuery.refetch()} />;
  }
  const addons = addonsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const resources = (resourcesQuery.data ?? []).filter((r) => r.availability === "available");
  const planName = new Map(plans.map((p) => [p.id, p.name]));
  const resourceName = new Map((resourcesQuery.data ?? []).map((r) => [r.key, r]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-muted">
          Add-ons extend a plan&apos;s allowances. They version like plans —
          only published add-on versions are offered to tenants, and enabled
          add-ons keep their sold terms.
        </p>
        <Button onClick={() => setEditor({ mode: "create" })}>New add-on</Button>
      </div>

      {addons.length === 0 ? (
        <EmptyState title="No add-ons yet" description="Create the first add-on to sell extra capacity on top of plans." />
      ) : (
        addons.map((addon) => (
          <Card key={addon.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{addon.name}</CardTitle>
                <Button
                  variant="subtle"
                  isLoading={draftMutation.isPending}
                  onClick={() => draftMutation.mutate(addon.id)}
                >
                  New draft version
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted">{addon.description}</p>
              <p className="mt-1 text-sm">
                Resource: <span className="font-medium">{resourceName.get(addon.resourceKey)?.name ?? addon.resourceKey}</span>
                {" · "}Linked plans:{" "}
                <span className="font-medium">
                  {addon.linkedPlanIds.map((id) => planName.get(id) ?? id).join(", ") || "None"}
                </span>
              </p>
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Allowance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addon.versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                        <TableCell>
                          <VersionStatusBadge status={v.status} />
                        </TableCell>
                        <TableCell>{v.priceMinor === null ? "Custom" : `${formatMoney(v.priceMinor, v.currency)} / month`}</TableCell>
                        <TableCell>
                          {v.allowanceAmount === null
                            ? "Custom"
                            : `+${v.allowanceAmount.toLocaleString()} ${resourceName.get(addon.resourceKey)?.unitLabel ?? ""}`}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap gap-3">
                            {v.status === "draft" ? (
                              <button
                                type="button"
                                className="font-medium text-primary underline"
                                onClick={() => setEditor({ mode: "edit", addon, versionId: v.id })}
                              >
                                Edit draft
                              </button>
                            ) : null}
                            {(NEXT_ACTIONS[v.status] ?? []).map((a) => (
                              <button
                                key={a.action}
                                type="button"
                                className="font-medium text-primary underline"
                                onClick={() => setPending({ addonId: addon.id, versionId: v.id, action: a.action, label: a.label })}
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
              </div>
            </CardBody>
          </Card>
        ))
      )}

      <AddonEditorDialog
        key={editor ? (editor.mode === "create" ? "create" : editor.versionId) : "closed"}
        target={editor}
        plans={plans}
        resources={resources}
        onClose={() => setEditor(null)}
        onSaved={async () => {
          setEditor(null);
          await invalidate();
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        title={`${pending?.label ?? ""} this add-on version?`}
        description={
          pending?.action === "publish"
            ? "The add-on becomes available to tenants on its linked plans at this price. Subscriptions that already enabled it keep their sold terms."
            : pending?.action === "retire"
              ? "Tenants will no longer see this add-on as available. Subscriptions that already enabled it keep their sold terms."
              : "This moves the add-on version to the next lifecycle stage."
        }
        confirmLabel={pending?.label ?? "Confirm"}
        variant={pending?.action === "retire" ? "destructive" : "primary"}
        isConfirming={transitionMutation.isPending}
        onConfirm={() => pending && transitionMutation.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function AddonEditorDialog({
  target,
  plans,
  resources,
  onClose,
  onSaved,
}: {
  target: EditorTarget;
  plans: { id: string; name: string }[];
  resources: { key: string; name: string; unitLabel: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const editing = target?.mode === "edit" ? target : null;
  const editVersion = editing?.addon.versions.find((v) => v.id === editing.versionId);
  const defaults: FormValues = {
    name: editing?.addon.name ?? "",
    description: editing?.addon.description ?? "",
    resourceKey: editing?.addon.resourceKey ?? resources[0]?.key ?? "",
    price:
      editVersion?.priceMinor === null || editVersion?.priceMinor === undefined
        ? ""
        : minorToMajorInput(editVersion.priceMinor, "USD"),
    allowanceAmount:
      editVersion?.allowanceAmount === null || editVersion?.allowanceAmount === undefined
        ? ""
        : String(editVersion.allowanceAmount),
    linkedPlanIds: Object.fromEntries(
      plans.map((p) => [p.id, editing?.addon.linkedPlanIds.includes(p.id) ?? false]),
    ),
  };
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  const mutation = useMutation({
    mutationFn: (input: AddonDraftInput) =>
      editing
        ? updateAddonDraft(editing.addon.id, editing.versionId, input)
        : createAddon(input),
    onSuccess: async () => {
      toast({ title: editing ? "Add-on draft saved" : "Add-on created", variant: "success" });
      await onSaved();
    },
    onError: (error) => {
      applyApiFieldErrors(error, setError);
      toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" });
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      name: values.name,
      description: values.description,
      resourceKey: values.resourceKey,
      priceMinor: values.price.trim() === "" ? null : parseMajorToMinor(values.price, "USD"),
      allowanceAmount: values.allowanceAmount.trim() === "" ? null : Number(values.allowanceAmount),
      linkedPlanIds: plans.filter((p) => values.linkedPlanIds[p.id]).map((p) => p.id),
    });
  });

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={editing ? `Edit add-on draft — ${editing.addon.name}` : "New add-on"}
      description="Add-ons start as draft v1 and publish through the same lifecycle as plans."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button isLoading={mutation.isPending} onClick={onSubmit}>
            {editing ? "Save draft" : "Create add-on"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField label="Name" required error={errors.name?.message}>
          <Input placeholder="e.g. Extra 100 GB storage" {...register("name")} />
        </FormField>
        <FormField label="Description" required error={errors.description?.message}>
          <Textarea rows={2} {...register("description")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Resource" required error={errors.resourceKey?.message}>
            <Select {...register("resourceKey")}>
              {resources.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name} ({r.unitLabel})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Allowance amount" error={errors.allowanceAmount?.message} description="Empty = custom.">
            <Input inputMode="numeric" placeholder="e.g. 100" {...register("allowanceAmount")} />
          </FormField>
          <FormField label="Price (USD / month)" error={errors.price?.message} description="Empty = custom.">
            <Input inputMode="decimal" placeholder="e.g. 5.00" {...register("price")} />
          </FormField>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Offer on plans</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register(`linkedPlanIds.${p.id}`)} />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
