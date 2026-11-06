import { routes } from "@/lib/routes";
import { SignInForm } from "./sign-in-form";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const { notice, next } = await searchParams;
  // Only same-origin relative redirects (open-redirect guard).
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  return (
    <AuthCard
      title="Sign in to Fluxeaze"
      description="Welcome back — manage less, accomplish more."
      footer={
        <p>
          New to Fluxeaze?{" "}
          <Link href={routes.auth.signUp} className="font-medium text-primary underline">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href={routes.requestPilot} className="font-medium text-primary underline">
            request a pilot
          </Link>
          .
        </p>
      }
    >
      <SignInForm notice={notice ?? null} next={safeNext} />
    </AuthCard>
  );
}
