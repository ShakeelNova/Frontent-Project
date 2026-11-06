"use client";

import { routes } from "@/lib/routes";

import { normalizeApiError } from "@/api/errors";
import { signUp } from "@/api/services/auth";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema, newPasswordSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    organizationName: z.string().trim().min(2, "Enter your organization's name."),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Re-enter your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const mutation = useMutation({
    mutationFn: (values: SignUpValues) =>
      signUp({
        fullName: values.fullName,
        organizationName: values.organizationName,
        email: values.email,
        password: values.password,
      }),
    onSuccess: async (result) => {
      // Backend flow decides: verify-first shows the check-email panel;
      // immediate-session flows go straight to the portal.
      if (!result.requiresEmailVerification) {
        await refresh();
        router.push(routes.portal.root);
      }
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  if (mutation.isSuccess && mutation.data.requiresEmailVerification) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success" title="Account created — check your email">
          We&apos;ve sent a verification link to your email address. Open it to
          activate your account, then sign in. The link expires after a short
          time for your security.
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

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
    >
      <MockHint>
        Any details create an account — except{" "}
        <code className="font-mono">owner@demo.fluxeaze.test</code>, which
        returns “already registered”.
      </MockHint>

      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}

      <FormField label="Your full name" required error={errors.fullName?.message}>
        <Input autoComplete="name" placeholder="Full name" {...register("fullName")} />
      </FormField>
      <FormField label="Organization name" required error={errors.organizationName?.message}>
        <Input autoComplete="organization" placeholder="School / academy / institute name" {...register("organizationName")} />
      </FormField>
      <FormField label="Work email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
      </FormField>
      <FormField
        label="Password"
        required
        description="At least 8 characters. We never display or log your password."
        error={errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" placeholder="Create a password" {...register("password")} />
      </FormField>
      <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" placeholder="Re-enter your password" {...register("confirmPassword")} />
      </FormField>

      <Button type="submit" size="lg" isLoading={mutation.isPending} className="w-full">
        Create account
      </Button>
    </form>
  );
}
