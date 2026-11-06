"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  addTimetableEntry,
  deleteTimetableEntry,
  getTimetable,
  listClasses,
  listSubjects,
  type TimetableEntry,
} from "@/api/services/academics";
import { getOrgPreferences } from "@/api/services/setup";
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
import { formatUtcTimeInZone, zonedTimeToUtc } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const entrySchema = z
  .object({
    weekday: z.number().min(1).max(6),
    subjectId: z.string().min(1, "Select a subject."),
    startsAt: z.string().min(1, "Select a start time."),
    endsAt: z.string().min(1, "Select an end time."),
  })
  .refine((v) => v.startsAt < v.endsAt, {
    path: ["endsAt"],
    message: "End time must be after the start time.",
  });
type EntryValues = z.infer<typeof entrySchema>;

export function TimetableView({ classId }: { classId: string }) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const canManage =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<TimetableEntry | null>(null);

  const classesQuery = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: Boolean(orgId),
  });
  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";
  const query = useQuery({
    queryKey: queryKeys.academics.timetable(orgId, classId),
    queryFn: () => getTimetable(orgId, classId),
    enabled: Boolean(orgId),
  });

  const klass = classesQuery.data?.find((c) => c.id === classId);

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteTimetableEntry(orgId, classId, entryId),
    onSuccess: async () => {
      toast({ title: "Timetable entry removed", variant: "success" });
      setDeleteEntry(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.academics.timetable(orgId, classId),
      });
    },
  });

  if (classesQuery.isPending || query.isPending) {
    return (
      <div role="status" aria-label="Loading timetable" className="flex flex-col gap-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (classesQuery.isSuccess && !klass) {
    return (
      <div>
        <h2 className="text-h4">Class not found</h2>
        <p className="mt-2 text-muted">
          This class may have been deleted, or it belongs to a branch you
          can&apos;t access.
        </p>
        <p className="mt-4">
          <Link href={routes.portal.academicsClasses} className="font-medium text-primary underline">
            ← Back to classes
          </Link>
        </p>
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const entries = query.data ?? [];

  return (
    <section aria-labelledby="timetable-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="timetable-heading" className="text-h4">
            Timetable — {klass?.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {klass?.programName} · {klass?.branchName} · Times shown in{" "}
            {timezone} (stored as UTC by the API).
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setAddOpen(true)}>Add session</Button>
        ) : (
          <p className="text-sm text-muted">Owners/GMs manage timetables.</p>
        )}
      </div>

      <div className="mt-5">
        {entries.length === 0 ? (
          <EmptyState
            title="Timetable not configured yet"
            description="No weekly sessions have been scheduled for this class. Add the first session to start building the week."
            action={
              canManage ? (
                <Button onClick={() => setAddOpen(true)}>Add session</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((day, idx) => {
              const dayEntries = entries
                .filter((e) => e.weekday === idx + 1)
                .sort((a, b) => a.startsAtUtc.localeCompare(b.startsAtUtc));
              return (
                <div
                  key={day}
                  className="rounded-lg border border-border bg-surface p-4"
                  aria-label={`${day} sessions`}
                >
                  <h3 className="text-h5">{day}</h3>
                  {dayEntries.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">No sessions</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {dayEntries.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start justify-between gap-2 rounded-md bg-surface-raised px-3 py-2"
                        >
                          <div>
                            <p className="font-medium">{e.subjectName}</p>
                            <p className="text-sm text-muted">
                              {formatUtcTimeInZone(e.startsAtUtc, timezone)} –{" "}
                              {formatUtcTimeInZone(e.endsAtUtc, timezone)}
                            </p>
                          </div>
                          {canManage ? (
                            <button
                              type="button"
                              className="text-sm font-medium text-primary underline"
                              onClick={() => setDeleteEntry(e)}
                              aria-label={`Remove ${e.subjectName} on ${day}`}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addOpen ? (
        <AddEntryDialog
          orgId={orgId}
          classId={classId}
          timezone={timezone}
          onClose={() => setAddOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteEntry !== null}
        title="Remove this session?"
        description={
          deleteEntry
            ? `${deleteEntry.subjectName} on ${WEEKDAYS[deleteEntry.weekday - 1]} (${formatUtcTimeInZone(deleteEntry.startsAtUtc, timezone)} – ${formatUtcTimeInZone(deleteEntry.endsAtUtc, timezone)}) will be removed from the weekly timetable.`
            : undefined
        }
        confirmLabel="Remove session"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setDeleteEntry(null)}
        onConfirm={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
      />
    </section>
  );
}

function AddEntryDialog({
  orgId,
  classId,
  timezone,
  onClose,
}: {
  orgId: string;
  classId: string;
  timezone: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, formState } = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: { weekday: 1, subjectId: "", startsAt: "08:00", endsAt: "08:45" },
  });
  const subjectsQuery = useQuery({
    queryKey: queryKeys.academics.subjects(orgId),
    queryFn: () => listSubjects(orgId),
    enabled: Boolean(orgId),
  });

  const mutation = useMutation({
    mutationFn: (values: EntryValues) =>
      addTimetableEntry(orgId, classId, {
        weekday: values.weekday,
        subjectId: values.subjectId,
        // User types org-local times; API stores UTC.
        startsAtUtc: zonedTimeToUtc(values.startsAt, timezone),
        endsAtUtc: zonedTimeToUtc(values.endsAt, timezone),
      }),
    onSuccess: async () => {
      toast({ title: "Session added", variant: "success" });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.academics.timetable(orgId, classId),
      });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add weekly session"
      description={`Times are in your organization timezone (${timezone}) and stored as UTC.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Add session
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Weekday" required error={formState.errors.weekday?.message}>
            <Select {...register("weekday", { valueAsNumber: true })}>
              {WEEKDAYS.map((day, i) => (
                <option key={day} value={i + 1}>
                  {day}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Subject" required error={formState.errors.subjectId?.message}>
            <Select {...register("subjectId")}>
              <option value="">Select a subject…</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Starts at" required error={formState.errors.startsAt?.message}>
            <Input type="time" {...register("startsAt")} />
          </FormField>
          <FormField label="Ends at" required error={formState.errors.endsAt?.message}>
            <Input type="time" {...register("endsAt")} />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
