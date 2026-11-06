"use client";

import { routes } from "@/lib/routes";

import { normalizeApiError } from "@/api/errors";
import { resetPassword } from "@/api/services/auth";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { applyApiFieldErrors } from "@/lib/forms";
import { newPasswordSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Re-enter your new password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

type ResetValues = z.infer<typeof resetPasswordSchema>;

function TokenInvalidPanel({ expired }: { expired: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert
        variant="error"
        title={expired ? "This reset link has expired" : "This reset link is no longer valid"}
      >
        {expired
          ? "Reset links work for a limited time. Request a fresh one and use it right away."
          : "It may have already been used, or been replaced by a newer link."}
      </Alert>
      <Link
        href={routes.auth.forgotPassword}
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Request a new reset link
      </Link>
    </div>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetPasswordSchema) });

  const mutation = useMutation({
    mutationFn: (values: ResetValues) =>
      resetPassword({ token, password: values.password }),
    onSuccess: () => router.push(routes.auth.signInNotice("reset")),
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  if (!token) return <TokenInvalidPanel expired={false} />;

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  if (errorInfo?.code === "TOKEN_EXPIRED") return <TokenInvalidPanel expired />;
  if (errorInfo?.code === "TOKEN_INVALID") return <TokenInvalidPanel expired={false} />;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      <MockHint>
        This page reads <code className="font-mono">?token=</code> from the URL.
        Use token <code className="font-mono">expired-token</code> to see the
        expired-link state; any other token succeeds.
      </MockHint>
      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}
      <FormField label="New password" required description="At least 8 characters." error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" placeholder="New password" {...register("password")} />
      </FormField>
      <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" placeholder="Re-enter new password" {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" size="lg" isLoading={mutation.isPending} className="w-full">
        Set new password
      </Button>
    </form>
  );
}
