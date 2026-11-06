"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  getMyNotices,
  getMyStudentAttendance,
  getMyStudentFees,
  getMyStudentResults,
  getMyStudentTimetable,
} from "@/api/services/student-portal";
import { PAYMENT_MODE_LABELS } from "@/api/services/fees";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { statusBadge } from "@/components/fees/vouchers-panel";
import { useStudentPortal } from "@/components/student-portal/student-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeInZone, formatUtcTimeInZone } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

function useStudentId(): string {
  const { student } = useStudentPortal();
  return student?.id ?? "";
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function StudentHomePanel() {
  const { student } = useStudentPortal();
  const studentId = useStudentId();
  const attendance = useQuery({
    queryKey: queryKeys.studentPortal.attendance(studentId),
    queryFn: () => getMyStudentAttendance(studentId),
    enabled: Boolean(studentId),
  });
  const fees = useQuery({
    queryKey: queryKeys.studentPortal.fees(studentId),
    queryFn: () => getMyStudentFees(studentId),
    enabled: Boolean(studentId),
  });
  const outstanding = (fees.data ?? []).reduce((s, v) => s + Math.max(0, v.balanceMinor), 0);
  const nextDue = (fees.data ?? [])
    .filter((v) => v.balanceMinor > 0)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h3">Assalamualaikum, {student?.fullName}</h1>
        <p className="mt-1 text-muted">
          {student?.className ?? "—"} · {student?.programName ?? "—"} ·{" "}
          {student?.organizationName}. Everything here is read-only and only
          about your linked student.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Attendance (term)"
          value={
            attendance.data ? `${attendance.data.summary.attendancePercent}%` : "…"
          }
          hint={
            attendance.data
              ? `${attendance.data.summary.present + attendance.data.summary.late} of ${attendance.data.summary.totalDays} days`
              : undefined
          }
          href={student ? `/student/attendance?student=${student.id}` : undefined}
        />
        <MetricCard
          label="Fees outstanding"
          value={fees.data && student ? formatMoney(outstanding, student.currency) : "…"}
          hint={nextDue ? `Next due ${nextDue.dueDate} (${nextDue.periodLabel})` : "All settled"}
          href={student ? `/student/fees?student=${student.id}` : undefined}
        />
        <MetricCard
          label="Timetable"
          value={student?.className ?? "—"}
          hint={`Times in ${student?.timezone ?? "org timezone"}`}
          href={student ? `/student/timetable?student=${student.id}` : undefined}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {student ? (
            <>
              <QuickLink href={routes.student.notices(student.id)}>Latest notices</QuickLink>
              <QuickLink href={routes.student.results(student.id)}>Results</QuickLink>
              <QuickLink href={routes.student.fees(student.id)}>
                Vouchers &amp; receipts
              </QuickLink>
            </>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline">
      {children} →
    </Link>
  );
}

const DAY_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  present: "success",
  late: "warning",
  absent: "error",
  excused: "info",
};

export function StudentAttendancePanel() {
  const studentId = useStudentId();
  const query = useQuery({
    queryKey: queryKeys.studentPortal.attendance(studentId),
    queryFn: () => getMyStudentAttendance(studentId),
    enabled: Boolean(studentId),
  });
  return (
    <section aria-labelledby="my-attendance-heading">
      <h1 id="my-attendance-heading" className="text-h3">
        Attendance
      </h1>
      <p className="mt-1 text-muted">Summary and the last 10 school days, from the school&apos;s records.</p>
      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <LoadingRows label="Loading attendance" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <MetricCard label="Attendance" value={`${query.data.summary.attendancePercent}%`} />
              <MetricCard label="Present" value={String(query.data.summary.present)} />
              <MetricCard label="Late" value={String(query.data.summary.late)} />
              <MetricCard label="Absent" value={String(query.data.summary.absent)} />
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {query.data.recent.map((d) => (
                <li key={d.date} className="flex items-center justify-between px-4 py-2.5">
                  <span>{d.date}</span>
                  <Badge variant={DAY_BADGE[d.status] ?? "default"}>
                    {d.status === "present"
                      ? "Present"
                      : d.status === "late"
                        ? "Late"
                        : d.status === "excused"
                          ? "Excused"
                          : "Absent"}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function StudentTimetablePanel() {
  const studentId = useStudentId();
  const query = useQuery({
    queryKey: queryKeys.studentPortal.timetable(studentId),
    queryFn: () => getMyStudentTimetable(studentId),
    enabled: Boolean(studentId),
  });
  return (
    <section aria-labelledby="my-timetable-heading">
      <h1 id="my-timetable-heading" className="text-h3">
        Timetable
      </h1>
      <p className="mt-1 text-muted">
        Weekly schedule{query.data?.className ? ` for ${query.data.className}` : ""} · times in{" "}
        {query.data?.timezone ?? "your school timezone"}.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <LoadingRows label="Loading timetable" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.entries.length === 0 ? (
          <EmptyState
            title="No timetable published yet"
            description="Your school hasn't published this class timetable yet. Check back soon."
          />
        ) : (
          WEEKDAYS.map((day, idx) => {
            const entries = query.data.entries
              .filter((e) => e.weekday === idx + 1)
              .sort((a, b) => (a.startsAtUtc < b.startsAtUtc ? -1 : 1));
            if (entries.length === 0) return null;
            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle>{day}</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {entries.map((e) => (
                      <li key={e.id} className="flex justify-between">
                        <span className="font-medium">{e.subjectName}</span>
                        <span className="text-muted">
                          {formatUtcTimeInZone(e.startsAtUtc, query.data.timezone)} –{" "}
                          {formatUtcTimeInZone(e.endsAtUtc, query.data.timezone)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}

export function StudentFeesPanel() {
  const studentId = useStudentId();
  const query = useQuery({
    queryKey: queryKeys.studentPortal.fees(studentId),
    queryFn: () => getMyStudentFees(studentId),
    enabled: Boolean(studentId),
  });
  return (
    <section aria-labelledby="my-fees-heading">
      <h1 id="my-fees-heading" className="text-h3">
        Fees &amp; receipts
      </h1>
      <p className="mt-1 text-muted">
        Your vouchers and the payments recorded against them. Online payment
        isn&apos;t available yet — please pay at the school office or by bank
        transfer using your voucher number as the reference.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <LoadingRows label="Loading fees" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No vouchers yet"
            description="Fee vouchers for this student will appear here once the school issues them."
          />
        ) : (
          query.data.map((v) => (
            <Card key={v.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle>
                  {v.periodLabel} · <span className="font-mono">{v.voucherNumber}</span>
                </CardTitle>
                {statusBadge(v.status)}
              </CardHeader>
              <CardBody className="flex flex-col gap-3 text-sm">
                <ul className="flex flex-col gap-1">
                  {v.components.map((c) => (
                    <li key={c.name} className="flex justify-between">
                      <span>{c.name}</span>
                      <span>{formatMoney(c.amountMinor, v.currency)}</span>
                    </li>
                  ))}
                  {v.discounts.map((d) => (
                    <li key={d.label} className="flex justify-between text-success-foreground">
                      <span>Discount — {d.label}</span>
                      <span>−{formatMoney(d.amountMinor, v.currency)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-border pt-1.5 font-semibold">
                    <span>Balance (due {v.dueDate})</span>
                    <span>{formatMoney(v.balanceMinor, v.currency)}</span>
                  </li>
                </ul>
                {v.payments.length ? (
                  <div>
                    <p className="font-medium">Receipts</p>
                    <ul className="mt-1.5 flex flex-col gap-1 text-muted">
                      {v.payments.map((p) => (
                        <li key={p.id} className="flex flex-wrap justify-between gap-2">
                          <span>
                            {p.receiptNumber} · {p.date} · {PAYMENT_MODE_LABELS[p.mode]} ·{" "}
                            {p.sourceLabel}
                          </span>
                          <span className="font-medium text-text">
                            {formatMoney(p.amountMinor, p.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted">No payments recorded against this voucher yet.</p>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

export function StudentNoticesPanel() {
  const studentId = useStudentId();
  const { student } = useStudentPortal();
  const query = useQuery({
    queryKey: queryKeys.studentPortal.notices(studentId),
    queryFn: () => getMyNotices(studentId),
    enabled: Boolean(studentId),
  });
  return (
    <section aria-labelledby="my-notices-heading">
      <h1 id="my-notices-heading" className="text-h3">
        Notices
      </h1>
      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <LoadingRows label="Loading notices" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState title="No notices" description="School announcements will appear here." />
        ) : (
          query.data.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <CardTitle>{n.title}</CardTitle>
                <p className="text-sm text-muted">
                  {n.audienceLabel} ·{" "}
                  {formatDateTimeInZone(n.publishedAtUtc, student?.timezone ?? "UTC")}
                </p>
              </CardHeader>
              <CardBody>
                <p className="text-sm">{n.body}</p>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

export function StudentResultsPanel() {
  const studentId = useStudentId();
  const query = useQuery({
    queryKey: queryKeys.studentPortal.results(studentId),
    queryFn: () => getMyStudentResults(studentId),
    enabled: Boolean(studentId),
  });
  return (
    <section aria-labelledby="my-results-heading">
      <h1 id="my-results-heading" className="text-h3">
        Results
      </h1>
      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <LoadingRows label="Loading results" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !query.data.available ? (
          <EmptyState
            title="Results not yet available"
            description={
              query.data.unavailableReason ??
              "Your school hasn't published results for this term yet."
            }
          />
        ) : (
          query.data.terms.map((term) => (
            <div key={term.label}>
              <h2 className="mb-3 text-h4">{term.label}</h2>
              <Table aria-label={`Results — ${term.label}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {term.subjects.map((s) => (
                    <TableRow key={s.subjectName}>
                      <TableCell className="font-medium">{s.subjectName}</TableCell>
                      <TableCell>
                        {s.marksObtained} / {s.marksTotal}
                      </TableCell>
                      <TableCell>{s.gradeLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
