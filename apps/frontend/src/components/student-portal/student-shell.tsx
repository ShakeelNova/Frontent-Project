"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";
import { getMyStudents, type LinkedStudent } from "@/api/services/student-portal";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { BrandMark } from "@/components/ui/icon";
import { Select } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

interface StudentPortalContext {
  students: LinkedStudent[];
  student: LinkedStudent | null;
}

const Ctx = createContext<StudentPortalContext>({ students: [], student: null });

export function useStudentPortal(): StudentPortalContext {
  return useContext(Ctx);
}

const NAV = [
  { href: routes.student.root, label: "Home", icon: "dashboard" as const },
  { href: routes.student.attendance(), label: "Attendance", icon: "attendance" as const },
  { href: routes.student.timetable(), label: "Timetable", icon: "calendar" as const },
  { href: routes.student.fees(), label: "Fees", icon: "wallet" as const },
  { href: routes.student.notices(), label: "Notices", icon: "bell" as const },
  { href: routes.student.results(), label: "Results", icon: "chart" as const },
];

function Centered({
  title,
  description,
  action,
  loading,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-h4 font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        {loading ? (
          <div className="mt-5 flex justify-center">
            <PageLoading label="Loading…" />
          </div>
        ) : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * Student/parent experience — deliberately separate and simplified.
 * Only the signed-in user's LINKED students render here (backend-resolved
 * from the session); no management navigation or admin data, ever.
 */
export function StudentShell({ children }: { children: ReactNode }) {
  const { user, isLoading, signOut, isSigningOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentParam = searchParams.get("student") ?? "";

  const studentsQuery = useQuery({
    queryKey: queryKeys.studentPortal.myStudents,
    queryFn: getMyStudents,
    enabled: Boolean(user && user.kind !== "staff"),
  });
  const students = studentsQuery.data ?? [];
  const student =
    students.find((s) => s.id === studentParam) ?? students[0] ?? null;

  const handleSignOut = async () => {
    await signOut().catch(() => undefined);
    router.push(routes.auth.signIn);
  };

  if (isLoading) {
    return <Centered loading title="Loading your area" description="Checking your session…" />;
  }
  if (!user) {
    return (
      <Centered
        title="Sign in to view your student area"
        description="Students and guardians sign in with the account your school invited. You'll only ever see your own linked student(s)."
        action={
          <Link
            href={routes.auth.signInNext("%2Fstudent")}
            className="inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
          >
            Sign in
          </Link>
        }
      />
    );
  }
  if (user.kind === "staff") {
    return (
      <Centered
        title="This area is for students & parents"
        description="You're signed in with a staff account. Your management tools are in the organization portal."
        action={
          <Link
            href={routes.portal.root}
            className="inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-hover"
          >
            Go to the organization portal
          </Link>
        }
      />
    );
  }
  if (studentsQuery.isPending) {
    return <Centered loading title="Loading your students" description="Fetching your linked student records…" />;
  }
  if (studentsQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <ErrorState error={studentsQuery.error} onRetry={() => void studentsQuery.refetch()} />
      </div>
    );
  }
  if (students.length === 0) {
    return (
      <Centered
        title="No students linked yet"
        description="Your account isn't linked to a student yet. Ask your school office to link your email as a guardian — your student's information will appear here automatically."
      />
    );
  }

  const studentSelector = students.length > 1 ? (
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">Switch student</span>
      <Select
        aria-label="Switch student"
        value={student?.id ?? ""}
        onChange={(event) =>
          router.replace(`${pathname}?student=${event.target.value}`, { scroll: false })
        }
        className="min-h-9 w-full max-w-56 py-1.5 text-sm"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.fullName} ({s.studentCode})
          </option>
        ))}
      </Select>
    </label>
  ) : (
    <p className="truncate text-sm font-medium text-text">
      {student?.fullName} <span className="text-faint">({student?.studentCode})</span>
    </p>
  );

  return (
    <AppShell
      sections={[
        {
          heading: "My area",
          items: NAV.map((item) => ({ label: item.label, href: item.href, icon: item.icon })),
        },
      ]}
      user={{ name: user.fullName, email: user.email, role: "Student & parent" }}
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
      topbarLeading={studentSelector}
      sidebarContext={
        student ? (
          <div className="rounded-xl border border-border bg-surface-raised px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-text">{student.fullName}</p>
            <p className="truncate text-caption text-faint">
              {student.organizationName} · {student.branchName}
            </p>
            <p className="mt-1 text-caption font-medium text-primary">{student.studentCode}</p>
          </div>
        ) : null
      }
      brandSubtitle="Student & Parent"
    >
      <Ctx.Provider value={{ students, student }}>{children}</Ctx.Provider>
    </AppShell>
  );
}
