import { routes } from "@/lib/routes";
import { ForgotPasswordForm } from "./forgot-password-form";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your account email and we'll send you a reset link."
      footer={
        <p>
          Remember it after all?{" "}
          <Link href={routes.auth.signIn} className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
