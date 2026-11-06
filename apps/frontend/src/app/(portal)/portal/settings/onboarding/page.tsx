import { routes } from "@/lib/routes";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Onboarding" };

/**
 * Onboarding hub: staff invitations and manual student creation are LIVE;
 * bulk imports arrive in Phase 7 (linked honestly).
 */
export default function SettingsOnboardingPage() {
  return (
    <section aria-labelledby="onboarding-heading">
      <h2 id="onboarding-heading" className="text-h4">
        Staff &amp; student onboarding
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invite staff</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted">
              Staff invitations with approvals and role assignment are live in
              the Staff directory — invitees accept via{" "}
              <code className="font-mono">/invite/[token]</code>.
            </p>
            <p className="mt-3">
              <Link href={routes.portal.staff} className="font-medium text-primary underline">
                Open the staff directory →
              </Link>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add or import students</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted">
              Manual student creation (with guardians and enrollments) is live
              in the Students directory, and CSV imports (upload → mapping →
              backend validation → explicit commit) are live under Imports.
            </p>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              <Link href={routes.portal.students} className="font-medium text-primary underline">
                Open the students directory →
              </Link>
              <Link href={routes.portal.imports} className="font-medium text-primary underline">
                Open imports →
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
      <p className="mt-5 text-sm text-muted">
        Nothing is blocked meanwhile —{" "}
        <Link href={routes.portal.root} className="font-medium text-primary underline">
          back to the dashboard
        </Link>
        .
      </p>
    </section>
  );
}
