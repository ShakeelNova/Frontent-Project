import { routes } from "@/lib/routes";
import { SignUpForm } from "./sign-up-form";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start with your organization — branches, staff and students come next."
      footer={
        <p>
          Already have an account?{" "}
          <Link href={routes.auth.signIn} className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
