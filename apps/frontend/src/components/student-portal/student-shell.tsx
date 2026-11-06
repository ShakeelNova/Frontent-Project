"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { getMyStudents, type LinkedStudent } from "@/api/services/student-portal";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { ThemeToggle } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
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
  { href: routes.student.root, label: "Home" },
  { href: routes.student.attendance(), label: "Attendance" },
  { href: routes.student.timetable(), label: "Timetable" },
  { href: routes.student.fees(), label: "Fees" },
  { href: routes.student.notices(), label: "Notices" },
  { href: routes.student.results(), label: "Results" },
];

/**
 * Student/parent shell (Phase 7). Strictly limited: linked students come
 * from the backend session; staff users and signed-out visitors never
 * see student data here (and the API enforces the same with 403s).
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

  const withStudent = (href: string) =>
    student ? `${href}?student=${student.id}` : href;

  const frame = (content: ReactNode, showNav = false) => (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-14 w-full max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
          <p className="text-base font-bold tracking-tight">
            Fluxeaze <span className="font-medium text-muted">· Student &amp; Parent</span>
          </p>
          {showNav ? (
            <nav aria-label="Student" className="flex flex-wrap items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active =
                  item.href === "/student"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={withStudent(item.href)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-text hover:bg-surface-raised",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button
                variant="subtle"
                isLoading={isSigningOut}
                onClick={async () => {
                  await signOut();
                  router.push(routes.auth.signIn);
                }}
              >
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
        {showNav && student ? (
          <div className="border-t border-border">
            <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3 px-4 py-2 text-sm sm:px-6">
              <span className="text-muted">
                {student.organizationName} · {student.branchName}
              </span>
              {students.length > 1 ? (
                <label className="flex items-center gap-2">
                  <span className="font-medium">Student</span>
                  <Select
                    aria-label="Switch student"
                    value={student.id}
                    onChange={(e) =>
                      router.replace(`${pathname}?student=${e.target.value}`, {
                        scroll: false,
                      })
                    }
                    className="w-56"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.studentCode})
                      </option>
                    ))}
                  </Select>
                </label>
              ) : (
                <span className="font-medium">
                  {student.fullName} ({student.studentCode})
                </span>
              )}
            </div>
          </div>
        ) : null}
      </header>
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        {content}
      </main>
    </div>
  );

  if (isLoading) return frame(<PageLoading label="Loading…" />);
  if (!user) {
    return frame(
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-h3">Sign in to view your student area</h1>
        <p className="mt-2 text-muted">
          Students and guardians sign in with the account your school
          invited. You&apos;ll only ever see your own linked student(s).
        </p>
        <p className="mt-4">
          <Link
            href={routes.auth.signInNext("%2Fstudent")}
            className="font-medium text-primary underline"
          >
            Sign in →
          </Link>
        </p>
      </div>,
    );
  }
  if (user.kind === "staff") {
    return frame(
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-h3">This area is for students &amp; parents</h1>
        <p className="mt-2 text-muted">
          You&apos;re signed in with a staff account. Your management tools
          are in the organization portal.
        </p>
        <p className="mt-4">
          <Link href={routes.portal.root} className="font-medium text-primary underline">
            Go to the organization portal →
          </Link>
        </p>
      </div>,
    );
  }
  if (studentsQuery.isPending) return frame(<PageLoading label="Loading your students…" />);
  if (studentsQuery.isError) {
    return frame(
      <ErrorState
        error={studentsQuery.error}
        onRetry={() => void studentsQuery.refetch()}
      />,
    );
  }
  if (students.length === 0) {
    return frame(
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-h3">No students linked yet</h1>
        <p className="mt-2 text-muted">
          Your account isn&apos;t linked to a student yet. Ask your school
          office to link your email as a guardian — your student&apos;s
          information will appear here automatically.
        </p>
      </div>,
    );
  }

  return frame(
    <Ctx.Provider value={{ students, student }}>{children}</Ctx.Provider>,
    true,
  );
}
