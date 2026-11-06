"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createBranch,
  listBranchDetails,
  updateBranch,
  type BranchDetail,
} from "@/api/services/setup";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Enter a branch name."),
});
type BranchValues = z.infer<typeof branchSchema>;

export function BranchesPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<BranchDetail | null>(null);

  const query = useQuery({
    queryKey: queryKeys.organization.branchDetails(orgId),
    queryFn: () => listBranchDetails(orgId),
    enabled: Boolean(orgId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchValues>({ resolver: zodResolver(branchSchema) });

  const mutation = useMutation({
    mutationFn: (values: BranchValues) => createBranch(orgId, values),
    onSuccess: async () => {
      toast({ title: "Branch added", variant: "success" });
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.branches(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.branchDetails(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.setupStatus(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root }),
      ]);
    },
  });

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <div className="flex flex-col gap-6">
      {query.isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No branches yet"
          description="Add your first branch below — most institutes start with their main campus."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {query.data.map((branch) => (
            <li key={branch.id}>
              <Card>
                <CardBody className="flex flex-col gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {branch.name}
                    <Badge variant={branch.status === "active" ? "success" : "default"}>
                      {branch.status === "active" ? "Active" : "Disabled"}
                    </Badge>
                  </p>
                  <p className="text-sm text-muted">
                    Code: <span className="font-mono">{branch.code || "—"}</span>
                    {branch.location ? ` · ${branch.location}` : ""}
                  </p>
                  <div>
                    <Button
                      variant="subtle"
                      onClick={() => setEditTarget(branch)}
                      aria-label={`Edit ${branch.name}`}
                    >
                      Edit branch
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
        aria-label="Add a branch"
      >
        <h3 className="text-h5">Add a branch</h3>
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Branch name" required error={errors.name?.message}>
          <Input placeholder="e.g. Main campus" {...register("name")} />
        </FormField>
        <div>
          <Button type="submit" isLoading={mutation.isPending}>
            Add branch
          </Button>
        </div>
      </form>

      {editTarget ? (
        <BranchEditDialog
          orgId={orgId}
          branch={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
    </div>
  );
}

const branchEditSchema = z.object({
  name: z.string().trim().min(2, "Enter a branch name."),
  code: z.string().trim().min(1, "Enter a short code.").max(8),
  location: z.string().trim().max(120).optional(),
  status: z.enum(["active", "disabled"]),
});
type BranchEditValues = z.infer<typeof branchEditSchema>;

function BranchEditDialog({
  orgId,
  branch,
  onClose,
}: {
  orgId: string;
  branch: BranchDetail;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDisable, setConfirmDisable] = useState<BranchEditValues | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<BranchEditValues>({
    resolver: zodResolver(branchEditSchema),
    defaultValues: {
      name: branch.name,
      code: branch.code,
      location: branch.location,
      status: branch.status,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BranchEditValues) =>
      updateBranch(orgId, branch.id, { ...values, location: values.location ?? "" }),
    onSuccess: async () => {
      toast({ title: "Branch updated", variant: "success" });
      setConfirmDisable(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.branchDetails(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.branches(orgId) }),
      ]);
      onClose();
    },
    onError: (error) => {
      setConfirmDisable(null);
      applyApiFieldErrors(error, setError);
    },
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  const submit = (values: BranchEditValues) => {
    if (values.status === "disabled" && branch.status === "active") {
      setConfirmDisable(values);
      return;
    }
    mutation.mutate(values);
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={`Edit ${branch.name}`}
        footer={
          <>
            <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(submit)} isLoading={mutation.isPending}>
              Save branch
            </Button>
          </>
        }
      >
        <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          {errorInfo ? (
            <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
              {errorInfo.friendlyDescription}
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Branch name" required error={formState.errors.name?.message}>
              <Input {...register("name")} />
            </FormField>
            <FormField label="Code" required error={formState.errors.code?.message}>
              <Input {...register("code")} />
            </FormField>
            <FormField label="Location" error={formState.errors.location?.message}>
              <Input placeholder="e.g. Gulberg, Karachi" {...register("location")} />
            </FormField>
            <FormField label="Status" error={formState.errors.status?.message}>
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </FormField>
          </div>
          <p className="text-sm text-muted">
            Disabling a branch keeps all its history; the backend stops new
            activity there.
          </p>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDisable !== null}
        title={`Disable ${branch.name}?`}
        description="Staff and students keep their records and history, but the branch is marked disabled for new activity. You can re-enable it later."
        confirmLabel="Disable branch"
        isConfirming={mutation.isPending}
        onCancel={() => setConfirmDisable(null)}
        onConfirm={() => confirmDisable && mutation.mutate(confirmDisable)}
      />
    </>
  );
}
