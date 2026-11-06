"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  changePassword,
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from "@/api/services/settings";
import { getOrgPreferences } from "@/api/services/setup";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTimeInZone } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(1, "Re-enter the new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

/**
 * Account security (Phase 7): change password + session management.
 * Passwords go straight to the API and are never displayed or logged.
 */
export default function SecurityPage() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; label: string } | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.settings.sessions,
    queryFn: listSessions,
  });
  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  const { register, handleSubmit, setError, reset, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (v: PasswordValues) =>
      changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      toast({ title: "Password changed", variant: "success" });
      reset();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const passwordError = passwordMutation.isError
    ? normalizeApiError(passwordMutation.error)
    : null;

  const setSessions = (data: Awaited<ReturnType<typeof listSessions>>) =>
    queryClient.setQueryData(queryKeys.settings.sessions, data);

  const revoke = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: (data) => {
      toast({ title: "Session revoked", variant: "success" });
      setRevokeTarget(null);
      setSessions(data);
    },
    onError: () => setRevokeTarget(null),
  });
  const revokeOthers = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (data) => {
      toast({ title: "Other sessions signed out", variant: "success" });
      setConfirmRevokeOthers(false);
      setSessions(data);
    },
    onError: () => setConfirmRevokeOthers(false),
  });
  const sessionError = revoke.isError
    ? normalizeApiError(revoke.error)
    : revokeOthers.isError
      ? normalizeApiError(revokeOthers.error)
      : null;

  const otherSessions = (sessionsQuery.data ?? []).filter((s) => !s.current);

  return (
    <section aria-labelledby="security-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="security-heading" className="text-h4">
          Security
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your password and active sign-in sessions. Sessions are managed by
          the backend — revoking one signs that device out.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            noValidate
            onSubmit={handleSubmit((v) => passwordMutation.mutate(v))}
            className="flex max-w-md flex-col gap-4"
          >
            {passwordError ? (
              <Alert variant="error" title={passwordError.friendlyTitle} requestId={passwordError.requestId}>
                {passwordError.friendlyDescription}
              </Alert>
            ) : null}
            <FormField
              label="Current password"
              required
              error={formState.errors.currentPassword?.message}
            >
              <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
            </FormField>
            <FormField label="New password" required error={formState.errors.newPassword?.message}>
              <Input type="password" autoComplete="new-password" {...register("newPassword")} />
            </FormField>
            <FormField
              label="Confirm new password"
              required
              error={formState.errors.confirmPassword?.message}
            >
              <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            </FormField>
            <div>
              <Button type="submit" isLoading={passwordMutation.isPending}>
                Change password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Active sessions</CardTitle>
          {otherSessions.length ? (
            <Button variant="subtle" onClick={() => setConfirmRevokeOthers(true)}>
              Sign out other sessions
            </Button>
          ) : null}
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {sessionError ? (
            <Alert variant="error" title={sessionError.friendlyTitle} requestId={sessionError.requestId}>
              {sessionError.friendlyDescription}
            </Alert>
          ) : null}
          {sessionsQuery.isPending ? (
            <div role="status" aria-label="Loading sessions" className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sessionsQuery.isError ? (
            <ErrorState
              error={sessionsQuery.error}
              onRetry={() => void sessionsQuery.refetch()}
            />
          ) : (
            <ul className="divide-y divide-border">
              {(sessionsQuery.data ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {s.deviceLabel}
                      {s.current ? <Badge variant="success">This device</Badge> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {s.locationLabel} · last active{" "}
                      {formatDateTimeInZone(s.lastActiveUtc, timezone)}
                    </p>
                  </div>
                  {!s.current ? (
                    <Button
                      variant="subtle"
                      onClick={() => setRevokeTarget({ id: s.id, label: s.deviceLabel })}
                      aria-label={`Revoke ${s.deviceLabel}`}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={revokeTarget !== null}
        title={`Revoke the session on ${revokeTarget?.label ?? "this device"}?`}
        description="That device will be signed out immediately."
        confirmLabel="Revoke session"
        isConfirming={revoke.isPending}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revoke.mutate(revokeTarget.id)}
      />
      <ConfirmDialog
        open={confirmRevokeOthers}
        title="Sign out all other sessions?"
        description="Every device except this one will be signed out immediately."
        confirmLabel="Sign out others"
        isConfirming={revokeOthers.isPending}
        onCancel={() => setConfirmRevokeOthers(false)}
        onConfirm={() => revokeOthers.mutate()}
      />
    </section>
  );
}
