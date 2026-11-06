"use client";

import { routes } from "@/lib/routes";

import { normalizeApiError } from "@/api/errors";
import { resendVerification, verifyEmail } from "@/api/services/auth";
import { PageLoading } from "@/components/feedback/page-loading";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const resendSchema = z.object({ email: emailSchema });

function ResendVerificationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof resendSchema>>({
    resolver: zodResolver(resendSchema),
  });
  const mutation = useMutation({ mutationFn: resendVerification });

  if (mutation.isSuccess) {
    return (
      <Alert variant="success" title="New verification link sent">
        If an account exists for that email, a fresh link is on its way.
      </Alert>
    );
  }
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-3"
    >
      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}
      <FormField label="Email for a new verification link" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
      </FormField>
      <Button type="submit" variant="subtle" isLoading={mutation.isPending}>
        Resend verification email
      </Button>
    </form>
  );
}

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const startedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => verifyEmail({ token }),
  });
  const { mutate } = mutation;

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;
    mutate();
  }, [token, mutate]);

  if (!token || mutation.isIdle || mutation.isPending) {
    return token ? (
      <PageLoading label="Verifying your email…" className="min-h-40 py-8" />
    ) : (
      <div className="flex flex-col gap-4">
        <Alert variant="error" title="This verification link is no longer valid">
          The link is missing its token. Request a fresh verification email below.
        </Alert>
        <ResendVerificationForm />
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success" title="Email verified">
          Your account is active. Sign in to open your Fluxeaze portal.
        </Alert>
        <Link
          href={routes.auth.signInNotice("verified")}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const errorInfo = normalizeApiError(mutation.error);
  return (
    <div className="flex flex-col gap-4">
      <MockHint>
        Token <code className="font-mono">expired-token</code> lands here; any
        other token verifies successfully.
      </MockHint>
      <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
        {errorInfo.friendlyDescription}
      </Alert>
      <ResendVerificationForm />
      <p className="text-sm text-muted">
        Still stuck? <Link href={routes.requestPilot} className="font-medium text-primary underline">Contact the Fluxeaze team</Link> and
        mention the request ID above.
      </p>
    </div>
  );
}
