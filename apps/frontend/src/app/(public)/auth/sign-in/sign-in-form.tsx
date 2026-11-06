"use client";

import { routes } from "@/lib/routes";

import { normalizeApiError } from "@/api/errors";
import { resendVerification, signIn } from "@/api/services/auth";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema, signInPasswordSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const signInSchema = z.object({
  email: emailSchema,
  password: signInPasswordSchema,
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm({
  notice,
  next,
}: {
  notice?: string | null;
  next?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, refresh } = useAuth();

  // Already signed in → honor an explicit return target first (deep links
  // like /portal/students/…), else the portal entry (gate handles the
  // organization chooser from there). Guarded by `submitted` so the
  // form's OWN successful sign-in navigates via the mutation below
  // (to the org chooser) instead of racing this redirect to /portal.
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (!isLoading && user && !submitted) {
      router.replace(
        next ??
          (user.isPlatformAdmin
            ? "/admin"
            : user.kind !== "staff"
              ? "/student"
              : "/portal"),
      );
    }
  }, [isLoading, user, submitted, next, router]);

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async (signedInUser) => {
      await refresh();
      // Explicit return target wins; platform admins go to the internal
      // admin area; students/guardians to their own area; staff resolve
      // tenant scope first (single-org users auto-continue to /portal).
      if (next) router.push(next);
      else if (signedInUser.isPlatformAdmin) router.push(routes.admin.root);
      else if (signedInUser.kind !== "staff") router.push(routes.student.root);
      else router.push(routes.auth.organizations);
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendVerification({ email: getValues("email") }),
    onSuccess: () =>
      toast({
        title: "Verification email sent",
        description: "Check your inbox for a fresh verification link.",
        variant: "success",
      }),
    onError: (error) =>
      toast({ title: normalizeApiError(error).friendlyTitle, variant: "error" }),
  });

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const needsVerification = errorInfo?.code === "EMAIL_NOT_VERIFIED";

  const onSubmit = handleSubmit((values) => {
    setSubmitted(true);
    mutation.mutate(values);
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {notice === "verified" ? (
        <Alert variant="success" title="Email verified">
          Your email is confirmed — sign in to continue.
        </Alert>
      ) : null}
      {notice === "reset" ? (
        <Alert variant="success" title="Password updated">
          Sign in with your new password.
        </Alert>
      ) : null}

      <MockHint>
        Sign in as <code className="font-mono">owner@demo.fluxeaze.test</code>{" "}
        (any password; 4 mock organizations: owner, GM, branch manager and a
        fresh empty org). For the student/parent area use{" "}
        <code className="font-mono">guardian@demo.fluxeaze.test</code>; for the
        platform-admin area use{" "}
        <code className="font-mono">admin@fluxeaze.test</code>.
        Also try{" "}
        <code className="font-mono">noorg@fluxeaze.test</code> (no
        organizations yet),{" "}
        <code className="font-mono">locked@fluxeaze.test</code> and{" "}
        <code className="font-mono">unverified@fluxeaze.test</code>.
      </MockHint>

      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
          {needsVerification ? (
            <span className="mt-3 block">
              <Button
                variant="subtle"
                size="sm"
                isLoading={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                Resend verification email
              </Button>
            </span>
          ) : null}
        </Alert>
      ) : null}

      <FormField label="Email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
      </FormField>
      <FormField label="Password" required error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" placeholder="Your password" {...register("password")} />
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <Link href={routes.auth.forgotPassword} className="text-sm font-medium text-primary underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" isLoading={mutation.isPending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
