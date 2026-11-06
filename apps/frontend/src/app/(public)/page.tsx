import { routes } from "@/lib/routes";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { AreaChart, Donut } from "@/components/ui/charts";
import { Icon, type IconName } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
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

const FEATURES: Array<{ title: string; body: string; icon: IconName; tone: "purple" | "cyan" | "green" | "pink" }> = [
  {
    title: "Central operations & attendance",
    body: "Student and staff attendance in one place — manual marking and QR sessions built for busy mornings, with duplicate checks, leave requests and corrections handled as first-class workflows.",
    icon: "attendance",
    tone: "purple",
  },
  {
    title: "Multi-branch visibility",
    body: "Owners and general managers see the whole organization at a glance, compare branches, and drill into a single campus — while branch teams only ever see the branches they're authorized for.",
    icon: "chart",
    tone: "cyan",
  },
  {
    title: "Students & staff, end to end",
    body: "Admissions, enrollments, guardians, class assignment and transfers for students; directories, designations, invitations and role-based access for staff — with validated bulk imports.",
    icon: "students",
    tone: "green",
  },
  {
    title: "Fee tracking & collections",
    body: "Fee structures, vouchers, dues and receipts in your organization's own currency. Outstanding balances stay visible so follow-ups are factual, calm and on time.",
    icon: "wallet",
    tone: "pink",
  },
];

const MODULES = [
  "Student directory",
  "Admissions",
  "Academic structure",
  "Timetable",
  "Attendance",
  "QR check-in",
  "Staff directory",
  "Roles & permissions",
  "Fee structures",
  "Vouchers",
  "Manual receipts",
  "Imports",
  "Dashboards",
  "Branch comparison",
  "Parent portal",
  "Billing",
];

const TRUST = [
  {
    title: "Your data stays yours",
    body: "Organization data is isolated per tenant and scoped per branch. Access is checked on the server for every request — not just hidden in the interface.",
    icon: "shield" as IconName,
  },
  {
    title: "Role-based access, by default",
    body: "Owners, managers, teachers, students and parents each get an experience shaped to their role. Students and parents only ever see their own linked information.",
    icon: "user" as IconName,
  },
  {
    title: "Built for accountability",
    body: "Sensitive actions — fee postings, approvals, destructive changes — sit behind confirmations and leave a trail your team can review.",
    icon: "check" as IconName,
  },
];

const PREVIEW_CHART = [
  { label: "Mon", value: 62 },
  { label: "Tue", value: 74 },
  { label: "Wed", value: 68 },
  { label: "Thu", value: 82 },
  { label: "Fri", value: 78 },
  { label: "Sat", value: 91 },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-dots opacity-40" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <Reveal>
            <Badge variant="purple" dot>
              The Education Operations OS
            </Badge>
            <h1 className="mt-5 max-w-3xl text-h1 font-bold leading-[1.05] tracking-[-0.04em] text-text sm:text-[3.25rem]">
              Run your institution from{" "}
              <span className="text-primary">one calm workspace.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Fluxeaze brings attendance, students, staff and fees for every branch
              into one beautifully simple system — so your team spends its day
              teaching and helping students, not wrestling spreadsheets.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={routes.requestPilot}
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-glow transition-all duration-150 hover:bg-primary-hover"
              >
                Request a pilot
                <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                href={routes.auth.signIn}
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-medium text-text shadow-xs transition-colors hover:bg-surface-raised"
              >
                Sign in
              </Link>
              <Link
                href={routes.pricing}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
              >
                View pricing
              </Link>
            </div>
            <ul aria-label="Built for" className="mt-8 flex flex-wrap gap-2">
              {INSTITUTIONS.map((name) => (
                <li key={name}>
                  <Badge variant="neutral">{name}</Badge>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Product preview */}
          <Reveal delay={0.1} className="mt-12">
            <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-cream" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green/70" />
                </div>
                <p className="text-caption font-medium text-faint">Product preview · illustrative data</p>
                <Badge variant="purple" dot>Live demo</Badge>
              </div>
              <div className="grid lg:grid-cols-[220px_1fr]">
                <div className="hidden border-r border-border bg-surface-raised p-4 lg:block">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                      <Icon name="dashboard" className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold tracking-tight">Fluxeaze</span>
                  </div>
                  <div className="mt-5 flex flex-col gap-1">
                    {[
                      { label: "Dashboard", icon: "dashboard" as IconName, active: true },
                      { label: "Students", icon: "students" as IconName },
                      { label: "Attendance", icon: "attendance" as IconName },
                      { label: "Academics", icon: "academics" as IconName },
                      { label: "Fees & billing", icon: "wallet" as IconName },
                      { label: "Reports", icon: "chart" as IconName },
                      { label: "Settings", icon: "settings" as IconName },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className={
                          item.active
                            ? "flex items-center gap-2 rounded-lg bg-primary-soft px-2.5 py-2 text-sm font-medium text-primary"
                            : "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text-secondary"
                        }
                      >
                        <Icon name={item.icon} className="h-4 w-4" />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-caption font-medium text-faint">Welcome back</p>
                      <p className="text-h4 font-bold tracking-[-0.02em]">Here&apos;s what&apos;s happening today.</p>
                    </div>
                    <Badge variant="success" dot>All systems operational</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total students" value="1,248" icon={<Icon name="students" className="h-5 w-5" />} trend={12.5} trendLabel="vs last month" spark={[20, 28, 24, 36, 32, 44, 48]} />
                    <StatCard label="Total staff" value="86" icon={<Icon name="staff" className="h-5 w-5" />} tone="cyan" trend={8.2} trendLabel="vs last month" spark={[12, 14, 13, 18, 17, 21, 22]} />
                    <StatCard label="Attendance" value="94.2%" icon={<Icon name="attendance" className="h-5 w-5" />} tone="green" trend={2.4} trendLabel="this week" spark={[70, 74, 72, 80, 78, 86, 88]} />
                    <StatCard label="Fees collected" value="$24,850" icon={<Icon name="wallet" className="h-5 w-5" />} tone="pink" trend={15.7} trendLabel="this month" spark={[10, 16, 14, 22, 20, 28, 32]} />
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
                    <Card>
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-text">Academic performance</p>
                            <p className="text-caption text-faint">Attendance rate · this week</p>
                          </div>
                          <Badge variant="purple">+2.4%</Badge>
                        </div>
                        <div className="mt-3">
                          <AreaChart data={PREVIEW_CHART} height={170} valueSuffix="%" />
                        </div>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="flex flex-col items-center justify-center gap-2">
                        <p className="text-sm font-semibold text-text">Overall attendance</p>
                        <Donut value={94} label="94%" caption="this week" tone="green" />
                        <p className="text-caption text-faint">Across all branches</p>
                      </CardBody>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Modules */}
      <section aria-labelledby="modules-heading" className="border-y border-border bg-surface-raised/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-center text-caption font-semibold uppercase tracking-[0.14em] text-faint">
            One system, every module
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {MODULES.map((module) => (
              <li key={module}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption font-medium text-text-secondary">
                  <Icon name="check" className="h-3 w-3 text-primary" />
                  {module}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">Why Fluxeaze</p>
          <h2 id="features-heading" className="mt-2 max-w-2xl text-h2 font-bold tracking-[-0.03em]">
            Operations that flow, branch after branch.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            One system of record for the work your front desk, coordinators and
            leadership repeat every single day.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.05}>
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardBody className="flex h-full flex-col gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-h5 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
            <h2 id="how-heading" className="mt-2 text-h2 font-bold tracking-[-0.03em]">
              From first login to a full week of operations.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Set up your institution", body: "Add your organization, branches, timezone and academic year. A guided checklist keeps every step visible without blocking your team.", icon: "building" as IconName },
              { step: "02", title: "Bring your people in", body: "Invite staff with roles, add or import students, and assign classes and subjects. Validation happens before anything is committed.", icon: "students" as IconName },
              { step: "03", title: "Run the week", body: "Mark attendance, run QR sessions, collect fees and watch dashboards update. Branch teams see only what they're authorized to see.", icon: "activity" as IconName },
            ].map((item, index) => (
              <Reveal key={item.step} delay={index * 0.06}>
                <Card className="h-full">
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon name={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="text-caption font-semibold text-faint">{item.step}</span>
                    </div>
                    <h3 className="text-h5 font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section aria-labelledby="trust-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">Trust</p>
          <h2 id="trust-heading" className="mt-2 text-h2 font-bold tracking-[-0.03em]">
            Trusted with your institution&apos;s data.
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TRUST.map((point, index) => (
            <Reveal key={point.title} delay={index * 0.05}>
              <Card className="h-full">
                <CardBody className="flex h-full flex-col gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-soft text-success">
                    <Icon name={point.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-h5 font-semibold">{point.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{point.body}</p>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section aria-labelledby="cta-heading" className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-white sm:px-10">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
            <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h2 id="cta-heading" className="text-h3 font-bold tracking-[-0.02em]">
                  Run a pilot with your next term.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Tell us about your institution — we&apos;ll follow up with next steps.
                  No pressure, no fake promises.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:ml-auto">
                <Link
                  href={routes.requestPilot}
                  className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-white/90"
                >
                  Request a pilot
                </Link>
                <Link
                  href={routes.pricing}
                  className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  See plans &amp; pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
