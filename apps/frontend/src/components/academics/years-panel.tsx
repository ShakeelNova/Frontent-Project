"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createAcademicYear,
  deleteAcademicYear,
  listAcademicYears,
  updateAcademicYear,
  type AcademicYear,
} from "@/api/services/academics";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const academicYearFormSchema = z
  .object({
    label: z.string().trim().min(2, "Give the year a label, e.g. 2026–27."),
    startsOn: z.string().min(1, "Select a start date."),
    endsOn: z.string().min(1, "Select an end date."),
  })
  .refine((v) => v.startsOn < v.endsOn, {
    path: ["endsOn"],
    message: "End date must be after the start date.",
  });

type Values = z.infer<typeof academicYearFormSchema>;

export function YearsPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const canManage =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogYear, setDialogYear] = useState<AcademicYear | "new" | null>(null);
  const [deleteYear, setDeleteYear] = useState<AcademicYear | null>(null);

  const query = useQuery({
    queryKey: queryKeys.academics.years(orgId),
    queryFn: () => listAcademicYears(orgId),
    enabled: Boolean(orgId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.academics.years(orgId) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicYear(orgId, id),
    onSuccess: async () => {
      toast({ title: "Academic year deleted", variant: "success" });
      setDeleteYear(null);
      await invalidate();
    },
    onError: () => setDeleteYear(null),
  });
  const deleteError = deleteMutation.isError
    ? normalizeApiError(deleteMutation.error)
    : null;

  return (
    <section aria-labelledby="years-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="years-heading" className="text-h4">
            Academic years
          </h2>
          <p className="mt-1 text-sm text-muted">
            “Current” is decided by the backend from each year&apos;s dates.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setDialogYear("new")}>Add academic year</Button>
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
          <div role="status" aria-label="Loading academic years" className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No academic years yet"
            description="Create your first academic year so classes and enrollments have a home."
            action={
              canManage ? (
                <Button onClick={() => setDialogYear("new")}>Add academic year</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {[...query.data]
              .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
              .map((year) => (
                <li
                  key={year.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {year.label}
                      {year.isCurrent ? <Badge variant="success">Current</Badge> : null}
                    </p>
                    <p className="text-sm text-muted">
                      {formatPlainDate(year.startsOn)} → {formatPlainDate(year.endsOn)}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <Button variant="subtle" onClick={() => setDialogYear(year)}>
                        Edit
                      </Button>
                      <Button
                        variant="subtle"
                        onClick={() => setDeleteYear(year)}
                        aria-label={`Delete ${year.label}`}
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

      {dialogYear !== null ? (
        <YearDialog
          orgId={orgId}
          year={dialogYear === "new" ? null : dialogYear}
          onClose={() => setDialogYear(null)}
          onSaved={invalidate}
        />
      ) : null}

      <ConfirmDialog
        open={deleteYear !== null}
        title={`Delete academic year ${deleteYear?.label ?? ""}?`}
        description="Years referenced by classes can't be deleted — the backend will reject those."
        confirmLabel="Delete year"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setDeleteYear(null)}
        onConfirm={() => deleteYear && deleteMutation.mutate(deleteYear.id)}
      />
    </section>
  );
}

function YearDialog({
  orgId,
  year,
  onClose,
  onSaved,
}: {
  orgId: string;
  year: AcademicYear | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(academicYearFormSchema),
  });
  useEffect(() => {
    reset(
      year
        ? { label: year.label, startsOn: year.startsOn, endsOn: year.endsOn }
        : { label: "", startsOn: "", endsOn: "" },
    );
  }, [year, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      year
        ? updateAcademicYear(orgId, year.id, values)
        : createAcademicYear(orgId, values),
    onSuccess: async () => {
      toast({ title: year ? "Academic year updated" : "Academic year created", variant: "success" });
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
      title={year ? `Edit ${year.label}` : "Add academic year"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            {year ? "Save changes" : "Create year"}
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
        <FormField label="Year label" required error={formState.errors.label?.message}>
          <Input placeholder="2026–27" {...register("label")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Starts on" required error={formState.errors.startsOn?.message}>
            <Input type="date" {...register("startsOn")} />
          </FormField>
          <FormField label="Ends on" required error={formState.errors.endsOn?.message}>
            <Input type="date" {...register("endsOn")} />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
