"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { listClasses } from "@/api/services/academics";
import {
  getQrSession,
  qrCheckIn,
  startQrSession,
} from "@/api/services/attendance";
import { getOrgPreferences } from "@/api/services/setup";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { formatUtcTimeInZone } from "@/lib/datetime";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const checkInSchema = z.object({
  token: z.string().trim().min(1, "Enter or scan a student code."),
});
type CheckInValues = z.infer<typeof checkInSchema>;

export function QrSessionPanel() {
  const { currentOrganization, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: Boolean(orgId),
  });
  const classes = useMemo(() => {
    const all = classesQuery.data ?? [];
    return currentBranch ? all.filter((c) => c.branchId === currentBranch.id) : all;
  }, [classesQuery.data, currentBranch]);
  const effectiveClassId = classes.some((c) => c.id === classId)
    ? classId
    : (classes[0]?.id ?? "");

  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  const sessionQuery = useQuery({
    queryKey: queryKeys.attendance.qrSession(orgId, sessionId),
    queryFn: () => getQrSession(orgId, sessionId!),
    enabled: Boolean(orgId && sessionId),
    refetchInterval: 5000,
  });
  const session = sessionQuery.data;

  const startMutation = useMutation({
    mutationFn: () => startQrSession(orgId, effectiveClassId, date),
    onSuccess: (s) => {
      setSessionId(s.id);
      queryClient.setQueryData(queryKeys.attendance.qrSession(orgId, s.id), s);
      toast({ title: "QR session started", variant: "success" });
    },
  });

  const { register, handleSubmit, setError, reset, formState } =
    useForm<CheckInValues>({ resolver: zodResolver(checkInSchema) });
  const checkInMutation = useMutation({
    mutationFn: (v: CheckInValues) => qrCheckIn(orgId, sessionId!, v.token),
    onSuccess: (s) => {
      queryClient.setQueryData(queryKeys.attendance.qrSession(orgId, s.id), s);
      const last = s.checkIns.at(-1);
      toast({
        title: last ? `${last.fullName} checked in` : "Checked in",
        variant: "success",
      });
      reset({ token: "" });
      void queryClient.invalidateQueries({ queryKey: queryKeys.attendance.studentsRoot(orgId) });
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const checkInError = checkInMutation.isError
    ? normalizeApiError(checkInMutation.error)
    : null;
  const startError = startMutation.isError
    ? normalizeApiError(startMutation.error)
    : null;

  return (
    <section aria-labelledby="qr-heading">
      <h2 id="qr-heading" className="text-h4">
        QR check-in session
      </h2>
      <p className="mt-1 text-sm text-muted">
        Start a session for a class — students check in with the session
        (their app/ID presents a token; here you can type a student code to
        simulate a scan). Duplicates are detected by the backend. This works
        without any biometric device.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="qr-date" className="mb-1.5 block text-sm font-medium">
            Date
          </label>
          <Input id="qr-date" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-64">
          <label htmlFor="qr-class" className="mb-1.5 block text-sm font-medium">
            Class / batch
          </label>
          <Select
            id="qr-class"
            value={effectiveClassId}
            disabled={classesQuery.isPending}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.length === 0 ? <option value="">No classes</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.programName}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={() => startMutation.mutate()}
          isLoading={startMutation.isPending}
          disabled={!effectiveClassId}
        >
          {session ? "Restart session" : "Start QR session"}
        </Button>
      </div>

      {startError ? (
        <div className="mt-4">
          <Alert variant="error" title={startError.friendlyTitle} requestId={startError.requestId}>
            {startError.friendlyDescription}
          </Alert>
        </div>
      ) : null}

      <div className="mt-6">
        {!session && !sessionQuery.isPending ? (
          <EmptyState
            title="No active session"
            description="Start a session to get a joining code for this class. Check-ins appear here live (auto-refreshing every few seconds)."
          />
        ) : sessionQuery.isError ? (
          <ErrorState error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />
        ) : session ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-lg border border-border p-5 text-center">
              <p className="text-sm text-muted">
                {session.className} · {session.date}
              </p>
              <p className="mt-3 font-mono text-4xl font-bold tracking-widest">
                {session.code}
              </p>
              <p className="mt-2 text-sm text-muted">
                Session code (also encoded in the class QR poster). Expires{" "}
                {formatUtcTimeInZone(session.expiresAtUtc.slice(11, 16), timezone)} ({timezone}).
              </p>

              <form
                noValidate
                onSubmit={handleSubmit((v) => checkInMutation.mutate(v))}
                className="mt-5 flex flex-col gap-3 text-left"
              >
                {checkInError ? (
                  <Alert
                    variant={checkInError.code === "ALREADY_CHECKED_IN" ? "warning" : "error"}
                    title={checkInError.friendlyTitle}
                    requestId={checkInError.requestId}
                  >
                    {checkInError.friendlyDescription}
                  </Alert>
                ) : null}
                <FormField
                  label="Student code (scan or type)"
                  error={formState.errors.token?.message}
                >
                  <Input placeholder="e.g. SUN-1001" autoComplete="off" {...register("token")} />
                </FormField>
                <Button type="submit" isLoading={checkInMutation.isPending}>
                  Check in
                </Button>
              </form>
            </div>

            <div>
              <h3 className="text-h5">
                Checked in · {session.checkIns.length} of {session.rosterTotal}
              </h3>
              {session.checkIns.length === 0 ? (
                <p className="mt-3 text-sm text-muted" aria-live="polite">
                  Waiting for the first check-in…
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border" aria-live="polite">
                  {[...session.checkIns].reverse().map((c) => (
                    <li key={c.studentId} className="flex items-center justify-between px-4 py-2.5">
                      <span>
                        {c.fullName}{" "}
                        <span className="font-mono text-xs text-muted">{c.studentCode}</span>
                      </span>
                      <span className="text-sm text-muted">
                        {formatUtcTimeInZone(c.checkedInAtUtc.slice(11, 16), timezone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
