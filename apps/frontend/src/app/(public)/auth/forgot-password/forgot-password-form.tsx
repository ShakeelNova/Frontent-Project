"use client";

import { routes } from "@/lib/routes";

import { normalizeApiError } from "@/api/errors";
import { forgotPassword } from "@/api/services/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const forgotPasswordSchema = z.object({ email: emailSchema });
type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({ mutationFn: forgotPassword });

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success" title="Check your email">
          If an account exists for that email address, we&apos;ve sent it a
          password-reset link. The link expires after a short time — check
          your spam folder if it doesn&apos;t arrive.
        </Alert>
        <Link
          href={routes.auth.signIn}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}
      <FormField label="Email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
      </FormField>
      <Button type="submit" size="lg" isLoading={mutation.isPending} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
