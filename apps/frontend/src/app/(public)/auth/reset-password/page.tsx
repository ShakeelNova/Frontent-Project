import { ResetPasswordForm } from "./reset-password-form";
import { PageLoading } from "@/components/feedback/page-loading";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Choose a new password for your Fluxeaze account."
    >
      <Suspense fallback={<PageLoading label="Loading…" className="min-h-40 py-8" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
