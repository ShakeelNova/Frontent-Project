import { routes } from "@/lib/routes";
import { InvitePanel } from "./invite-panel";
import { AuthCard } from "@/components/forms/auth-card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "You've been invited" };

export default function InvitePage() {
  return (
    <AuthCard
      title="You've been invited to Fluxeaze"
      description="Review your invitation, then set up your account."
      footer={
        <p>
          Already set up?{" "}
          <Link href={routes.auth.signIn} className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>
      }
    >
      <InvitePanel />
    </AuthCard>
  );
}
