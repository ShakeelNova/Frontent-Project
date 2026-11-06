"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  createClass,
  deleteClass,
  listAcademicYears,
  listClasses,
  listPrograms,
  updateClass,
  type ClassGroup,
} from "@/api/services/academics";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
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
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const classFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a class/batch name, e.g. Grade 10-A."),
  programId: z.string().min(1, "Select a program."),
  academicYearId: z.string().min(1, "Select an academic year."),
  branchId: z.string().min(1, "Select a branch."),
});
type Values = z.infer<typeof classFormSchema>;

export function ClassesPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const canManage =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogClass, setDialogClass] = useState<ClassGroup | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassGroup | null>(null);

  const query = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: Boolean(orgId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.academics.classes(orgId) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(orgId, id),
    onSuccess: async () => {
      toast({ title: "Class deleted", variant: "success" });
      setDeleteTarget(null);
      await invalidate();
    },
    onError: () => setDeleteTarget(null),
  });
  const deleteError = deleteMutation.isError ? normalizeApiError(deleteMutation.error) : null;

  return (
    <section aria-labelledby="classes-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="classes-heading" className="text-h4">
            Classes &amp; batches
          </h2>
          <p className="mt-1 text-sm text-muted">
            Each class belongs to a program, academic year and branch. Open a
            timetable from any row.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setDialogClass("new")}>Add class</Button>
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
          <div role="status" aria-label="Loading classes" className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Classes need a program and an academic year first — create those, then add classes here."
            action={
              canManage ? (
                <Button onClick={() => setDialogClass("new")}>Add class</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table aria-label="Classes">
              <TableHeader>
                <TableRow>
                  <TableHead>Class / batch</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.programName}</TableCell>
                    <TableCell>{c.academicYearLabel}</TableCell>
                    <TableCell>{c.branchName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={routes.portal.classTimetable(c.id)}
                          className="text-sm font-medium text-primary underline"
                        >
                          Timetable
                        </Link>
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              className="text-sm font-medium text-primary underline"
                              onClick={() => setDialogClass(c)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-sm font-medium text-primary underline"
                              onClick={() => setDeleteTarget(c)}
                              aria-label={`Delete ${c.name}`}
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {dialogClass !== null ? (
        <ClassDialog
          orgId={orgId}
          klass={dialogClass === "new" ? null : dialogClass}
          onClose={() => setDialogClass(null)}
          onSaved={invalidate}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete class ${deleteTarget?.name ?? ""}?`}
        description="Classes with active enrollments can't be deleted — end those enrollments first. The backend enforces this."
        confirmLabel="Delete class"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </section>
  );
}

function ClassDialog({
  orgId,
  klass,
  onClose,
  onSaved,
}: {
  orgId: string;
  klass: ClassGroup | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { branches } = useTenant();
  const { toast } = useToast();
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(classFormSchema),
  });
  const programsQuery = useQuery({
    queryKey: queryKeys.academics.programs(orgId),
    queryFn: () => listPrograms(orgId),
    enabled: Boolean(orgId),
  });
  const yearsQuery = useQuery({
    queryKey: queryKeys.academics.years(orgId),
    queryFn: () => listAcademicYears(orgId),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    reset(
      klass
        ? {
            name: klass.name,
            programId: klass.programId,
            academicYearId: klass.academicYearId,
            branchId: klass.branchId,
          }
        : { name: "", programId: "", academicYearId: "", branchId: branches[0]?.id ?? "" },
    );
  }, [klass, branches, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      klass ? updateClass(orgId, klass.id, values) : createClass(orgId, values),
    onSuccess: async () => {
      toast({ title: klass ? "Class updated" : "Class created", variant: "success" });
      await onSaved();
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const missingPrereqs =
    (programsQuery.data?.length ?? 0) === 0 || (yearsQuery.data?.length ?? 0) === 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title={klass ? `Edit ${klass.name}` : "Add class / batch"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending}
            disabled={missingPrereqs}
          >
            {klass ? "Save changes" : "Create class"}
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
        {missingPrereqs ? (
          <Alert variant="warning" title="Programs and academic years come first">
            Create at least one program and one academic year before adding classes.
          </Alert>
        ) : null}
        <FormField label="Class / batch name" required error={formState.errors.name?.message}>
          <Input placeholder="e.g. Grade 10-A or MDCAT Batch 1" {...register("name")} />
        </FormField>
        <FormField label="Program" required error={formState.errors.programId?.message}>
          <Select {...register("programId")}>
            <option value="">Select a program…</option>
            {(programsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Academic year" required error={formState.errors.academicYearId?.message}>
            <Select {...register("academicYearId")}>
              <option value="">Select a year…</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}{y.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Branch" required error={formState.errors.branchId?.message}>
            <Select {...register("branchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
