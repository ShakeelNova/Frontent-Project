"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createProgram,
  deleteProgram,
  listPrograms,
  updateProgram,
  type Program,
} from "@/api/services/academics";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const programFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a program name."),
  code: z.string().trim().min(2, "Enter a short code, e.g. FSC-MED.").max(16),
  description: z.string().trim(),
});
type Values = z.infer<typeof programFormSchema>;

export function ProgramsPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const canManage =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogProgram, setDialogProgram] = useState<Program | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const query = useQuery({
    queryKey: queryKeys.academics.programs(orgId),
    queryFn: () => listPrograms(orgId),
    enabled: Boolean(orgId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.academics.programs(orgId) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProgram(orgId, id),
    onSuccess: async () => {
      toast({ title: "Program deleted", variant: "success" });
      setDeleteTarget(null);
      await invalidate();
    },
    // Close the confirm so the rejection reason (Alert above) is visible.
    onError: () => setDeleteTarget(null),
  });
  const deleteError = deleteMutation.isError ? normalizeApiError(deleteMutation.error) : null;

  return (
    <section aria-labelledby="programs-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="programs-heading" className="text-h4">
            Programs / courses
          </h2>
          <p className="mt-1 text-sm text-muted">
            Programs group classes and enrollments (e.g. Matric Science, MDCAT Prep).
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setDialogProgram("new")}>Add program</Button>
        ) : (
          <p className="text-sm text-muted">Owners/GMs manage structure.</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {deleteError ? (
          <Alert variant="error" title={deleteError.friendlyTitle} requestId={deleteError.requestId}>
            {deleteError.friendlyDescription}
          </Alert>
        ) : null}

        {query.isPending ? (
          <div role="status" aria-label="Loading programs" className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No programs yet"
            description="Create a program, then add classes/batches under it."
            action={
              canManage ? (
                <Button onClick={() => setDialogProgram("new")}>Add program</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {query.data.map((program) => (
              <li
                key={program.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {program.name}{" "}
                    <span className="font-mono text-sm text-muted">{program.code}</span>
                  </p>
                  {program.description ? (
                    <p className="text-sm text-muted">{program.description}</p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <Button variant="subtle" onClick={() => setDialogProgram(program)}>
                      Edit
                    </Button>
                    <Button
                      variant="subtle"
                      onClick={() => setDeleteTarget(program)}
                      aria-label={`Delete ${program.name}`}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialogProgram !== null ? (
        <ProgramDialog
          orgId={orgId}
          program={dialogProgram === "new" ? null : dialogProgram}
          onClose={() => setDialogProgram(null)}
          onSaved={invalidate}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete program ${deleteTarget?.name ?? ""}?`}
        description="Programs with classes or enrollments can't be deleted — the backend will reject those and explain why."
        confirmLabel="Delete program"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </section>
  );
}

function ProgramDialog({
  orgId,
  program,
  onClose,
  onSaved,
}: {
  orgId: string;
  program: Program | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(programFormSchema),
  });
  useEffect(() => {
    reset(
      program
        ? { name: program.name, code: program.code, description: program.description ?? "" }
        : { name: "", code: "", description: "" },
    );
  }, [program, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      program
        ? updateProgram(orgId, program.id, values)
        : createProgram(orgId, values),
    onSuccess: async () => {
      toast({ title: program ? "Program updated" : "Program created", variant: "success" });
      await onSaved();
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={program ? `Edit ${program.name}` : "Add program"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            {program ? "Save changes" : "Create program"}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Program name" required error={formState.errors.name?.message}>
          <Input placeholder="e.g. FSc Pre-Medical" {...register("name")} />
        </FormField>
        <FormField label="Code" required error={formState.errors.code?.message}>
          <Input placeholder="e.g. FSC-MED" className="font-mono" {...register("code")} />
        </FormField>
        <FormField label="Description (optional)" error={formState.errors.description?.message}>
          <Textarea rows={3} {...register("description")} />
        </FormField>
      </form>
    </Dialog>
  );
}
