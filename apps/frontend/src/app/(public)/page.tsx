import { routes } from "@/lib/routes";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fluxeaze — Education Operations OS for schools, academies & institutes",
  description:
    "Multi-branch Education Operations OS: attendance, students, staff, fees and dashboards in one calm workspace. Make work flow easier. Manage less. Accomplish more.",
};

const INSTITUTIONS = [
  "Schools",
  "Colleges",
  "Academies",
  "Coaching centres",
  "Technical & vocational institutes",
];

const FEATURES = [
  {
    title: "Central operations & attendance",
    body: "Student and staff attendance in one place — manual marking and QR sessions built for busy mornings, with duplicate checks, leave requests and corrections handled as first-class workflows, not afterthoughts.",
  },
  {
    title: "Multi-branch visibility & dashboards",
    body: "Owners and general managers see the whole organization at a glance, compare branches, and drill into a single campus — while branch teams only ever see the branches they're authorized for.",
  },
  {
    title: "Student & staff management",
    body: "Admissions, enrollments, guardians, class assignment and transfers for students; directories, designations, invitations and role-based access for staff — with bulk CSV/Excel imports that validate before they commit.",
  },
  {
    title: "Fee tracking & collections",
    body: "Fee structures, vouchers, dues and receipts in your organization's own currency. Outstanding balances stay visible so follow-ups are factual, calm and on time.",
  },
];

const TRUST_POINTS = [
  {
    title: "Your data stays yours",
    body: "Organization data is isolated per tenant and scoped per branch. Access is checked on the server for every request — not just hidden in the interface.",
  },
  {
    title: "Role-based access, by default",
    body: "Owners, managers, teachers, students and parents each get an experience shaped to their role. Students and parents only ever see their own linked information.",
  },
  {
    title: "Built for accountability",
    body: "Sensitive actions — fee postings, approvals, destructive changes — sit behind confirmations and leave a trail your team can review.",
  },
];

/**
 * Public landing page (SSG). Marketing copy describes the product direction
 * honestly: features under active phased development are framed as such,
 * and deferred integrations (WhatsApp, video, payment gateways, payroll)
 * are explicitly NOT claimed as live.
 */
export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:px-6">
        <Badge variant="info">Early access — pilot cohorts onboarding now</Badge>
        <h1 className="mt-5 max-w-3xl">
          The Education Operations OS for multi-branch institutes
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Fluxeaze brings attendance, students, staff and fees for every branch
          into one calm workspace — so your team spends its day teaching and
          helping students, not wrestling spreadsheets.{" "}
          <strong className="font-semibold text-text">Make work flow easier.</strong>{" "}
          <strong className="font-semibold text-text">Manage less. Accomplish more.</strong>
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={routes.requestPilot}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            Request a pilot
          </Link>
          <Link
            href={routes.auth.signIn}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-transparent px-5 font-medium text-text hover:bg-surface-raised"
          >
            Sign in
          </Link>
          <Link
            href={routes.pricing}
            className="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-primary underline"
          >
            View pricing
          </Link>
        </div>
        <ul aria-label="Built for" className="mt-8 flex flex-wrap gap-2">
          {INSTITUTIONS.map((name) => (
            <li key={name}>
              <Badge>{name}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading" className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="features-heading">Operations that flow, branch after branch</h2>
          <p className="mt-2 max-w-2xl text-muted">
            One system of record for the work your front desk, coordinators and
            leadership repeat every single day.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <Card className="h-full">
                  <CardBody>
                    <h3 className="text-h5">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted">{feature.body}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust & security */}
      <section aria-labelledby="trust-heading" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="trust-heading">Trusted with your institution&apos;s data</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <li key={point.title}>
              <Card className="h-full">
                <CardBody>
                  <h3 className="text-h5">{point.title}</h3>
                  <p className="mt-2 text-sm text-muted">{point.body}</p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm text-muted">
          Honest roadmap note: Fluxeaze is in active, phased development with
          pilot institutes. Integrations such as WhatsApp messaging, online
          payment gateways, live video classes and payroll are planned for
          later phases and are not live features —.
        </p>
      </section>

      {/* CTA band */}
      <section aria-labelledby="cta-heading" className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 id="cta-heading" className="text-h3">
              Run a pilot with your next term
            </h2>
            <p className="mt-1 text-muted">
              Tell us about your institute — we&apos;ll follow up with next steps. No pressure, no fake promises.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:ml-auto">
            <Link
              href={routes.requestPilot}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              Request a pilot
            </Link>
            <Link
              href={routes.pricing}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-transparent px-5 font-medium text-text hover:bg-surface-raised"
            >
              See plans & pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
