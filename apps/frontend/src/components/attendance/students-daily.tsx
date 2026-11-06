"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { listClasses } from "@/api/services/academics";
import {
  getStudentAttendance,
  markStudentAttendance,
  STUDENT_ATTENDANCE_LABELS,
  type StudentAttendanceStatus,
} from "@/api/services/attendance";
import { getOrgPreferences } from "@/api/services/setup";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatUtcTimeInZone } from "@/lib/datetime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const STATUSES = Object.keys(STUDENT_ATTENDANCE_LABELS) as StudentAttendanceStatus[];

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StudentsDaily() {
  const { currentOrganization, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const date = searchParams.get("date") ?? todayLocal();
  const classIdParam = searchParams.get("class") ?? "";

  const classesQuery = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: Boolean(orgId),
  });
  const classes = useMemo(() => {
    const all = classesQuery.data ?? [];
    return currentBranch ? all.filter((c) => c.branchId === currentBranch.id) : all;
  }, [classesQuery.data, currentBranch]);
  const classId = classes.some((c) => c.id === classIdParam)
    ? classIdParam
    : (classes[0]?.id ?? "");

  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  const query = useQuery({
    queryKey: queryKeys.attendance.students(orgId, date, classId),
    queryFn: () => getStudentAttendance(orgId, date, classId),
    enabled: Boolean(orgId && classId),
  });

  // Local edits keyed date|class|student overlay the server day — they
  // never leak across days/classes, and the summary stays backend-computed.
  const [edits, setEdits] = useState<Record<string, StudentAttendanceStatus | "">>({});
  const editKey = (studentId: string) => `${date}|${classId}|${studentId}`;
  const draftOf = (studentId: string, serverStatus: StudentAttendanceStatus | null) =>
    edits[editKey(studentId)] ?? serverStatus ?? "";

  const dirty = useMemo(() => {
    if (!query.data) return false;
    return query.data.rows.some((r) => {
      const e = edits[`${date}|${classId}|${r.studentId}`];
      return e !== undefined && e !== (r.status ?? "");
    });
  }, [query.data, edits, date, classId]);

  const mutation = useMutation({
    mutationFn: () => {
      const rows = query.data?.rows ?? [];
      return markStudentAttendance(
        orgId,
        date,
        classId,
        rows
          .map((r) => ({ studentId: r.studentId, status: draftOf(r.studentId, r.status) }))
          .filter((m) => m.status !== "")
          .map((m) => ({ studentId: m.studentId, status: m.status as StudentAttendanceStatus })),
      );
    },
    onSuccess: async (data) => {
      toast({ title: "Attendance saved", variant: "success" });
      queryClient.setQueryData(queryKeys.attendance.students(orgId, date, classId), data);
      setEdits({});
    },
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const markAll = (status: StudentAttendanceStatus) => {
    if (!query.data) return;
    setEdits((prev) => ({
      ...prev,
      ...Object.fromEntries(query.data!.rows.map((r) => [editKey(r.studentId), status])),
    }));
  };

  return (
    <section aria-labelledby="student-att-heading">
      <h2 id="student-att-heading" className="text-h4">
        Daily student attendance
      </h2>
      <p className="mt-1 text-sm text-muted">
        Pick a date and class, set each student&apos;s status, then save — marks
        are submitted as one batch. Times (QR check-ins) show in {timezone}.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="att-date" className="mb-1.5 block text-sm font-medium">
            Date
          </label>
          <Input
            id="att-date"
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => e.target.value && setParam("date", e.target.value)}
          />
        </div>
        <div className="min-w-64">
          <label htmlFor="att-class" className="mb-1.5 block text-sm font-medium">
            Class / batch
          </label>
          <Select
            id="att-class"
            value={classId}
            disabled={classesQuery.isPending}
            onChange={(e) => setParam("class", e.target.value)}
          >
            {classes.length === 0 ? <option value="">No classes</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.programName} · {c.branchName}
              </option>
            ))}
          </Select>
        </div>
        {query.data && query.data.rows.length > 0 ? (
          <div className="flex gap-2">
            <Button variant="subtle" onClick={() => markAll("present")}>
              Mark all present
            </Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!dirty}>
              Save attendance
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription} Your changes are still here — fix
            and save again.
          </Alert>
        ) : null}

        {classesQuery.isPending || (classId && query.isPending) ? (
          <div role="status" aria-label="Loading attendance" className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            title="No classes to mark yet"
            description="Create classes under Academic structure first — attendance is marked per class/batch."
          />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data && query.data.rows.length === 0 ? (
          <EmptyState
            title="No students on this roster"
            description="This class has no active enrollments, so there is nobody to mark for this date."
          />
        ) : query.data ? (
          <>
            <p className="flex flex-wrap gap-2 text-sm" aria-live="polite">
              <Badge variant="success">Present · {query.data.summary.present}</Badge>
              <Badge variant="warning">Late · {query.data.summary.late}</Badge>
              <Badge variant="error">Absent · {query.data.summary.absent}</Badge>
              <Badge variant="info">Excused · {query.data.summary.excused}</Badge>
              <Badge variant="default">Unmarked · {query.data.summary.unmarked}</Badge>
              <span className="text-muted">of {query.data.summary.total}</span>
              {dirty ? <span className="font-medium text-warning-foreground">Unsaved changes</span> : null}
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {query.data.rows.map((row) => (
                <li
                  key={row.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{row.studentCode}</span>
                      {row.markedVia === "qr" && row.checkedInAtUtc
                        ? ` · QR check-in ${formatUtcTimeInZone(row.checkedInAtUtc.slice(11, 16), timezone)}`
                        : row.markedVia
                          ? ` · via ${row.markedVia}`
                          : ""}
                    </p>
                  </div>
                  <div>
                    <label className="sr-only" htmlFor={`att-${row.studentId}`}>
                      Attendance for {row.fullName}
                    </label>
                    <Select
                      id={`att-${row.studentId}`}
                      value={draftOf(row.studentId, row.status)}
                      onChange={(e) =>
                        setEdits((d) => ({
                          ...d,
                          [editKey(row.studentId)]: e.target.value as StudentAttendanceStatus | "",
                        }))
                      }
                      className="w-40"
                    >
                      <option value="">Unmarked</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STUDENT_ATTENDANCE_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
