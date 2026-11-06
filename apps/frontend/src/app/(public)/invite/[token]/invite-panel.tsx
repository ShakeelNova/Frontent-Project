"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { acceptInvite, getInvite, type InviteDetails } from "@/api/services/invites";
import { PageLoading } from "@/components/feedback/page-loading";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { applyApiFieldErrors } from "@/lib/forms";
import { newPasswordSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const acceptInviteSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /^[+()\-.\s\d]{7,20}$/.test(v),
        "Enter a valid phone number, or leave it empty.",
      ),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Re-enter your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

type AcceptValues = z.infer<typeof acceptInviteSchema>;

function InviteSummary({ invite }: { invite: InviteDetails }) {
  return (
    <dl className="grid gap-2 rounded-md border border-border bg-surface-raised px-4 py-3 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted">Organization</dt>
        <dd className="font-medium">{invite.organizationName}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted">Role</dt>
        <dd className="font-medium">{invite.roleLabel}</dd>
      </div>
      {invite.branchName ? (
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Branch</dt>
          <dd className="font-medium">{invite.branchName}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <dt className="text-muted">Invited email</dt>
        <dd className="font-medium break-all">{invite.email}</dd>
      </div>
    </dl>
  );
}

function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptValues>({ resolver: zodResolver(acceptInviteSchema) });

  const mutation = useMutation({
    mutationFn: (values: AcceptValues) =>
      acceptInvite(token, {
        fullName: values.fullName,
        phone: values.phone || undefined,
        password: values.password,
      }),
    onSuccess: () => router.push(routes.auth.signInNotice("verified")),
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-4"
    >
      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}
      <FormField label="Your full name" required error={errors.fullName?.message}>
        <Input autoComplete="name" placeholder="Full name" {...register("fullName")} />
      </FormField>
      <FormField label="Phone (optional)" error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel" placeholder="+92 300 1234567" {...register("phone")} />
      </FormField>
      <FormField
        label="Set your password"
        required
        description="At least 8 characters. Your password is sent securely and never shown or logged."
        error={errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" placeholder="Create a password" {...register("password")} />
      </FormField>
      <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" placeholder="Re-enter your password" {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" size="lg" isLoading={mutation.isPending} className="w-full">
        Accept invitation
      </Button>
    </form>
  );
}

export function InvitePanel() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const query = useQuery({
    queryKey: queryKeys.invite(token),
    queryFn: () => getInvite(token),
    enabled: Boolean(token),
    retry: false,
  });

  if (query.isPending) {
    return <PageLoading label="Loading your invitation…" className="min-h-40 py-8" />;
  }

  if (query.isError) {
    const info = normalizeApiError(query.error);
    const expired = info.code === "TOKEN_EXPIRED";
    return (
      <div className="flex flex-col gap-4">
        <MockHint>
          Try <code className="font-mono">/invite/ready-token</code> or{" "}
          <code className="font-mono">/invite/pending-token</code>.
        </MockHint>
        <Alert
          variant="error"
          title={expired ? "This invite has expired" : "This invite link is no longer valid"}
          requestId={info.requestId}
        >
          Ask the person who invited you to send a fresh invitation. If you
          already finished setting up your account, just sign in.
        </Alert>
        <Link
          href={routes.auth.signIn}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const invite = query.data;

  if (invite.status === "pending_approval") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="warning">Pending approval</Badge>
        </div>
        <InviteSummary invite={invite} />
        <Alert variant="info" title="Your invitation is being reviewed">
          {invite.organizationName} needs to approve this invitation before you
          can set your password. We&apos;ll let you finish setup as soon as it&apos;s
          approved — there&apos;s nothing you need to do Em-dash.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <MockHint>
        This is the ready-invite state. Compare with{" "}
        <code className="font-mono">/invite/pending-token</code> and{" "}
        <code className="font-mono">/invite/expired-token</code>.
      </MockHint>
      <InviteSummary invite={invite} />
      <AcceptInviteForm token={token} />
    </div>
  );
}
