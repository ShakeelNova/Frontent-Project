"use client";

import { routes } from "@/lib/routes";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Public-header auth actions, driven by the /auth/me bootstrap.
 * Signed out → Sign in. Signed in → Open portal + Sign out.
 * While the session resolves, render Sign in (the safe default chrome).
 */
export function AuthHeaderActions() {
  const { user, signOut, isSigningOut } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Link
        href={routes.auth.signIn}
        className="inline-flex min-h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted lg:block" title={user.email}>
        {user.fullName}
      </span>
      <Link
        href={routes.portal.root}
        className="inline-flex min-h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Open portal
      </Link>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={async () => {
          await signOut().catch(() => undefined);
          router.push(routes.auth.signIn);
        }}
        className="inline-flex min-h-9 items-center rounded-md border border-border px-3.5 text-sm font-medium text-text hover:bg-surface-raised disabled:opacity-60"
      >
        Sign out
      </button>
    </div>
  );
}
