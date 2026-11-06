"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  assignSubjectToClass,
  createSubject,
  deleteSubject,
  listClasses,
  listClassSubjects,
  listSubjects,
  unassignSubjectFromClass,
  updateSubject,
  type Subject,
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
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const subjectFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a subject name."),
  code: z.string().trim().min(1, "Enter a short code.").max(10),
});
type Values = z.infer<typeof subjectFormSchema>;

export function SubjectsPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const canManage =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogSubject, setDialogSubject] = useState<Subject | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const query = useQuery({
    queryKey: queryKeys.academics.subjects(orgId),
    queryFn: () => listSubjects(orgId),
    enabled: Boolean(orgId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.academics.subjects(orgId) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(orgId, id),
    onSuccess: async () => {
      toast({ title: "Subject deleted", variant: "success" });
      setDeleteTarget(null);
      await invalidate();
    },
    onError: () => setDeleteTarget(null),
  });
  const deleteError = deleteMutation.isError ? normalizeApiError(deleteMutation.error) : null;

  return (
    <section aria-labelledby="subjects-heading" className="flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="subjects-heading" className="text-h4">
              Subjects
            </h2>
            <p className="mt-1 text-sm text-muted">
              Organization-wide subject catalogue used by classes and timetables.
            </p>
          </div>
          {canManage ? (
            <Button onClick={() => setDialogSubject("new")}>Add subject</Button>
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
            <div role="status" aria-label="Loading subjects" className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.data.length === 0 ? (
            <EmptyState
              title="No subjects yet"
              description="Add subjects like Mathematics or Physics, then assign them to classes below."
              action={
                canManage ? (
                  <Button onClick={() => setDialogSubject("new")}>Add subject</Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {query.data.map((subject) => (
                <li
                  key={subject.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="font-medium">
                    {subject.name}{" "}
                    <span className="font-mono text-sm text-muted">{subject.code}</span>
                  </p>
                  {canManage ? (
                    <div className="flex gap-2">
                      <Button variant="subtle" onClick={() => setDialogSubject(subject)}>
                        Edit
                      </Button>
                      <Button
                        variant="subtle"
                        onClick={() => setDeleteTarget(subject)}
                        aria-label={`Delete ${subject.name}`}
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
      </div>

      <ClassSubjectsManager orgId={orgId} canManage={canManage} subjects={query.data ?? []} />

      {dialogSubject !== null ? (
        <SubjectDialog
          orgId={orgId}
          subject={dialogSubject === "new" ? null : dialogSubject}
          onClose={() => setDialogSubject(null)}
          onSaved={invalidate}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete subject ${deleteTarget?.name ?? ""}?`}
        description="Subjects assigned to classes can't be deleted until they're unassigned — the backend enforces this."
        confirmLabel="Delete subject"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </section>
  );
}

function ClassSubjectsManager({
  orgId,
  canManage,
  subjects,
}: {
  orgId: string;
  canManage: boolean;
  subjects: Subject[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const classesQuery = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: Boolean(orgId),
  });
  const assignedQuery = useQuery({
    queryKey: queryKeys.academics.classSubjects(orgId, classId),
    queryFn: () => listClassSubjects(orgId, classId),
    enabled: Boolean(orgId && classId),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.academics.classSubjects(orgId, classId),
    });

  const assign = useMutation({
    mutationFn: (subjectId: string) => assignSubjectToClass(orgId, classId, subjectId),
    onSuccess: async () => {
      toast({ title: "Subject assigned", variant: "success" });
      await invalidate();
    },
  });
  const unassign = useMutation({
    mutationFn: (subjectId: string) => unassignSubjectFromClass(orgId, classId, subjectId),
    onSuccess: async () => {
      toast({ title: "Subject removed", variant: "success" });
      await invalidate();
    },
  });
  const mutationError = assign.error ?? unassign.error;
  const errorInfo = mutationError ? normalizeApiError(mutationError) : null;
  const assignedIds = new Set((assignedQuery.data ?? []).map((s) => s.id));

  return (
    <div>
      <h3 className="text-h5">Assign subjects to a class</h3>
      <div className="mt-3 max-w-md">
        <label htmlFor="assign-class" className="mb-1.5 block text-sm font-medium">
          Class / batch
        </label>
        <Select
          id="assign-class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Select a class…</option>
          {(classesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.programName} · {c.branchName}
            </option>
          ))}
        </Select>
      </div>

      {errorInfo ? (
        <div className="mt-4">
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        </div>
      ) : null}

      {!classId ? (
        <p className="mt-3 text-sm text-muted">Pick a class to view and manage its subjects.</p>
      ) : assignedQuery.isPending ? (
        <div className="mt-4" role="status" aria-label="Loading class subjects">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : assignedQuery.isError ? (
        <div className="mt-4">
          <ErrorState error={assignedQuery.error} onRetry={() => void assignedQuery.refetch()} />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {subjects.map((subject) => {
            const assigned = assignedIds.has(subject.id);
            return (
              <li
                key={subject.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
              >
                <p>
                  {subject.name}{" "}
                  <span className="font-mono text-sm text-muted">{subject.code}</span>
                </p>
                {canManage ? (
                  assigned ? (
                    <Button
                      variant="subtle"
                      onClick={() => unassign.mutate(subject.id)}
                      isLoading={unassign.isPending}
                      aria-label={`Remove ${subject.name} from this class`}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="subtle"
                      onClick={() => assign.mutate(subject.id)}
                      isLoading={assign.isPending}
                      aria-label={`Assign ${subject.name} to this class`}
                    >
                      Assign
                    </Button>
                  )
                ) : (
                  <span className="text-sm text-muted">{assigned ? "Assigned" : "—"}</span>
                )}
              </li>
            );
          })}
          {subjects.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No subjects exist yet.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function SubjectDialog({
  orgId,
  subject,
  onClose,
  onSaved,
}: {
  orgId: string;
  subject: Subject | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(subjectFormSchema),
  });
  useEffect(() => {
    reset(subject ? { name: subject.name, code: subject.code } : { name: "", code: "" });
  }, [subject, reset]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      subject ? updateSubject(orgId, subject.id, values) : createSubject(orgId, values),
    onSuccess: async () => {
      toast({ title: subject ? "Subject updated" : "Subject created", variant: "success" });
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
      title={subject ? `Edit ${subject.name}` : "Add subject"}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            {subject ? "Save changes" : "Create subject"}
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
        <FormField label="Subject name" required error={formState.errors.name?.message}>
          <Input placeholder="e.g. Mathematics" {...register("name")} />
        </FormField>
        <FormField label="Code" required error={formState.errors.code?.message}>
          <Input placeholder="e.g. MATH" className="font-mono" {...register("code")} />
        </FormField>
      </form>
    </Dialog>
  );
}
