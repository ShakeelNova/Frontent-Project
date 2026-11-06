import { VerifyEmailPanel } from "./verify-email-panel";
import { PageLoading } from "@/components/feedback/page-loading";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      description="Confirming the verification link from your inbox."
    >
      <Suspense fallback={<PageLoading label="Verifying your email…" className="min-h-40 py-8" />}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthCard>
  );
}
