"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { listClasses, listPrograms } from "@/api/services/academics";
import {
  endEnrollment,
  enrollStudent,
  getStudent,
  linkGuardian,
  STUDENT_STATUS_LABELS,
  transferStudent,
  unlinkGuardian,
  updateStudentStatus,
  type StudentDetail,
  type StudentStatus,
} from "@/api/services/students";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { EditStudentDialog } from "@/components/students/student-forms";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const STATUS_VARIANT: Record<StudentStatus, "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  alumni: "default",
};

function useStudentMutations(orgId: string, studentId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(orgId, studentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.students.listRoot(orgId) }),
    ]);
  };
  return { refresh, toast };
}

export function StudentDetailView({ studentId }: { studentId: string }) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const query = useQuery({
    queryKey: queryKeys.students.detail(orgId, studentId),
    queryFn: () => getStudent(orgId, studentId),
    enabled: Boolean(orgId),
  });

  if (query.isPending) return <PageLoading label="Loading student…" />;

  if (query.isError) {
    const info = normalizeApiError(query.error);
    if (info.status === 404 || info.code === "STUDENT_NOT_FOUND") {
      return (
        <div className="mx-auto max-w-xl text-center">
          <h1>Student not found</h1>
          <p className="mt-3 text-muted">
            This student may have been removed, or the link is incorrect.
          </p>
          <p className="mt-5">
            <Link href={routes.portal.students} className="font-medium text-primary underline">
              ← Back to students
            </Link>
          </p>
        </div>
      );
    }
    if (info.isForbidden) {
      return (
        <div className="mx-auto max-w-xl">
          <Alert variant="error" title="You do not have permission to view this student">
            This student belongs to a branch you aren&apos;t authorized for. The
            backend enforces branch scope on every request.
          </Alert>
          <p className="mt-5">
            <Link href={routes.portal.students} className="font-medium text-primary underline">
              ← Back to students
            </Link>
          </p>
        </div>
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return <StudentDetailBody student={query.data} orgId={orgId} />;
}

function StudentDetailBody({ student, orgId }: { student: StudentDetail; orgId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StudentStatus | null>(null);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [endEnrollmentId, setEndEnrollmentId] = useState<string | null>(null);
  const { refresh, toast } = useStudentMutations(orgId, student.id);

  const statusMutation = useMutation({
    mutationFn: (status: StudentStatus) => updateStudentStatus(orgId, student.id, status),
    onSuccess: async () => {
      toast({ title: "Status updated", variant: "success" });
      setStatusTarget(null);
      await refresh();
    },
  });
  const unlinkMutation = useMutation({
    mutationFn: (guardianId: string) => unlinkGuardian(orgId, student.id, guardianId),
    onSuccess: async () => {
      toast({ title: "Guardian unlinked", variant: "success" });
      setUnlinkId(null);
      await refresh();
    },
  });
  const endEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      endEnrollment(orgId, student.id, enrollmentId, new Date().toISOString().slice(0, 10)),
    onSuccess: async () => {
      toast({ title: "Enrollment ended", variant: "success" });
      setEndEnrollmentId(null);
      await refresh();
    },
  });

  const actionError =
    statusMutation.error ?? unlinkMutation.error ?? endEnrollmentMutation.error;
  const actionErrorInfo = actionError ? normalizeApiError(actionError) : null;

  return (
    <div className="flex flex-col gap-5">
      <p>
        <Link href={routes.portal.students} className="text-sm font-medium text-primary underline">
          ← All students
        </Link>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground"
          >
            {student.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </span>
          <div>
            <h1>{student.fullName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
              <span className="font-mono">{student.studentCode}</span> ·{" "}
              {student.branchName}
              <Badge variant={STATUS_VARIANT[student.status]}>
                {STUDENT_STATUS_LABELS[student.status]}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
          <Button variant="subtle" onClick={() => setTransferOpen(true)}>
            Transfer branch
          </Button>
          {student.status === "active" ? (
            <>
              <Button variant="subtle" onClick={() => setStatusTarget("inactive")}>
                Withdraw (mark inactive)
              </Button>
              <Button variant="subtle" onClick={() => setStatusTarget("alumni")}>
                Mark as alumni
              </Button>
            </>
          ) : (
            <Button onClick={() => setStatusTarget("active")}>Reactivate</Button>
          )}
        </div>
      </div>

      {actionErrorInfo ? (
        <Alert variant="error" title={actionErrorInfo.friendlyTitle} requestId={actionErrorInfo.requestId}>
          {actionErrorInfo.friendlyDescription}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted">Date of birth</dt>
              <dd>{formatPlainDate(student.dateOfBirth)}</dd>
              <dt className="text-muted">Gender</dt>
              <dd>{student.gender ?? "Not specified"}</dd>
              <dt className="text-muted">Admission date</dt>
              <dd>{formatPlainDate(student.admissionDate)}</dd>
              <dt className="text-muted">Current class</dt>
              <dd>
                {student.currentClassName
                  ? `${student.currentClassName} · ${student.currentProgramName ?? ""}`
                  : "Not enrolled"}
              </dd>
              <dt className="text-muted">Email</dt>
              <dd>{student.email ?? "—"}</dd>
              <dt className="text-muted">Phone</dt>
              <dd>{student.phone ?? "—"}</dd>
              <dt className="text-muted">Address</dt>
              <dd>{student.address ?? "—"}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Guardians</CardTitle>
            <Button variant="subtle" onClick={() => setGuardianOpen(true)}>
              Link guardian
            </Button>
          </CardHeader>
          <CardBody>
            {student.guardians.length === 0 ? (
              <p className="text-sm text-muted">
                No guardians linked yet. Link a parent/guardian so they can be
                contacted (and later sign in to the parent portal).
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {student.guardians.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">
                        {g.fullName} <span className="text-muted">· {g.relationship}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {[g.phone, g.email].filter(Boolean).join(" · ") || "No contact details"}
                      </p>
                    </div>
                    <Button
                      variant="subtle"
                      onClick={() => setUnlinkId(g.id)}
                      aria-label={`Unlink ${g.fullName}`}
                    >
                      Unlink
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Admissions &amp; enrollments</CardTitle>
          <Button onClick={() => setEnrollOpen(true)}>Enroll in program/class</Button>
        </CardHeader>
        <CardBody>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-muted">
              No enrollments yet. Enroll this student into a program and class
              to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table aria-label="Enrollment history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>Class / batch</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...student.enrollments]
                    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
                    .map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.programName}</TableCell>
                        <TableCell>{e.className}</TableCell>
                        <TableCell>{formatPlainDate(e.startsOn)}</TableCell>
                        <TableCell>{e.endsOn ? formatPlainDate(e.endsOn) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={e.status === "active" ? "success" : "default"}>
                            {e.status === "active" ? "Active" : "Ended"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {e.status === "active" ? (
                            <Button
                              variant="subtle"
                              onClick={() => setEndEnrollmentId(e.id)}
                              aria-label={`End enrollment in ${e.className}`}
                            >
                              End enrollment
                            </Button>
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branch history</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="flex flex-col gap-3 text-sm">
            {[...student.branchHistory]
              .sort((a, b) => b.from.localeCompare(a.from))
              .map((h, i) => (
                <li key={`${h.branchId}-${h.from}-${i}`} className="flex flex-wrap gap-2">
                  <span className="font-medium">{h.branchName}</span>
                  <span className="text-muted">
                    {formatPlainDate(h.from)} → {h.to ? formatPlainDate(h.to) : "present"}
                  </span>
                  {h.to === null ? <Badge variant="info">Current</Badge> : null}
                </li>
              ))}
          </ol>
        </CardBody>
      </Card>

      <EditStudentDialog student={student} open={editOpen} onClose={() => setEditOpen(false)} />
      <GuardianDialog orgId={orgId} student={student} open={guardianOpen} onClose={() => setGuardianOpen(false)} />
      <EnrollDialog orgId={orgId} student={student} open={enrollOpen} onClose={() => setEnrollOpen(false)} />
      <TransferDialog orgId={orgId} student={student} open={transferOpen} onClose={() => setTransferOpen(false)} />

      <ConfirmDialog
        open={statusTarget !== null}
        title={
          statusTarget === "active"
            ? `Reactivate ${student.fullName}?`
            : statusTarget === "alumni"
              ? `Mark ${student.fullName} as alumni?`
              : `Withdraw ${student.fullName}?`
        }
        description={
          statusTarget === "active"
            ? "The student becomes active again and counts toward your active-student capacity."
            : statusTarget === "alumni"
              ? "Alumni keep their full history but no longer count as active students."
              : "The student will be marked inactive. History is preserved and they can be reactivated later."
        }
        confirmLabel={
          statusTarget === "active"
            ? "Reactivate"
            : statusTarget === "alumni"
              ? "Mark as alumni"
              : "Mark inactive"
        }
        variant={statusTarget === "active" ? "primary" : "destructive"}
        isConfirming={statusMutation.isPending}
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      />
      <ConfirmDialog
        open={unlinkId !== null}
        title="Unlink this guardian?"
        description="The guardian record stays in the system; only the link to this student is removed."
        confirmLabel="Unlink guardian"
        isConfirming={unlinkMutation.isPending}
        onCancel={() => setUnlinkId(null)}
        onConfirm={() => unlinkId && unlinkMutation.mutate(unlinkId)}
      />
      <ConfirmDialog
        open={endEnrollmentId !== null}
        title="End this enrollment?"
        description="The enrollment will be marked ended as of today. Attendance and fee history are preserved."
        confirmLabel="End enrollment"
        isConfirming={endEnrollmentMutation.isPending}
        onCancel={() => setEndEnrollmentId(null)}
        onConfirm={() => endEnrollmentId && endEnrollmentMutation.mutate(endEnrollmentId)}
      />
    </div>
  );
}

const guardianSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the guardian's name."),
  relationship: z.string().min(1, "Select a relationship."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || emailSchema.safeParse(v).success, "Enter a valid email address."),
  phone: z.string().trim(),
});
type GuardianValues = z.infer<typeof guardianSchema>;

function GuardianDialog({
  orgId,
  student,
  open,
  onClose,
}: {
  orgId: string;
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { refresh, toast } = useStudentMutations(orgId, student.id);
  const { register, handleSubmit, setError, formState } = useForm<GuardianValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { fullName: "", relationship: "Father", email: "", phone: "" },
  });
  const mutation = useMutation({
    mutationFn: (v: GuardianValues) =>
      linkGuardian(orgId, student.id, {
        fullName: v.fullName,
        relationship: v.relationship,
        email: v.email || undefined,
        phone: v.phone || undefined,
      }),
    onSuccess: async () => {
      toast({ title: "Guardian linked", variant: "success" });
      await refresh();
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Link a guardian"
      description={`For ${student.fullName} (${student.studentCode}).`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Link guardian
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Guardian full name" required error={formState.errors.fullName?.message}>
          <Input {...register("fullName")} />
        </FormField>
        <FormField label="Relationship" required error={formState.errors.relationship?.message}>
          <Select {...register("relationship")}>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone (optional)" error={formState.errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </FormField>
          <FormField label="Email (optional)" error={formState.errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}

const enrollSchema = z.object({
  programId: z.string().min(1, "Select a program."),
  classId: z.string().min(1, "Select a class/batch."),
  startsOn: z.string().min(1, "Select a start date."),
});
type EnrollValues = z.infer<typeof enrollSchema>;

function EnrollDialog({
  orgId,
  student,
  open,
  onClose,
}: {
  orgId: string;
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { refresh, toast } = useStudentMutations(orgId, student.id);
  const enrollForm = useForm<EnrollValues>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      programId: "",
      classId: "",
      startsOn: new Date().toISOString().slice(0, 10),
    },
  });
  const { register, handleSubmit, setError, formState } = enrollForm;
  const programId = useWatch({ control: enrollForm.control, name: "programId" });
  const programsQuery = useQuery({
    queryKey: queryKeys.academics.programs(orgId),
    queryFn: () => listPrograms(orgId),
    enabled: open && Boolean(orgId),
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.academics.classes(orgId),
    queryFn: () => listClasses(orgId),
    enabled: open && Boolean(orgId),
  });
  const programClasses = (classesQuery.data ?? []).filter((c) => c.programId === programId);

  const mutation = useMutation({
    mutationFn: (v: EnrollValues) => enrollStudent(orgId, student.id, v),
    onSuccess: async () => {
      toast({ title: "Enrollment created", variant: "success" });
      await refresh();
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const noStructure = programsQuery.isSuccess && (programsQuery.data?.length ?? 0) === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Enroll in program/class"
      description={`${student.fullName} · ${student.branchName}. Capacity and duplicate checks are enforced by the backend.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending}
            disabled={noStructure}
          >
            Enroll student
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        {noStructure ? (
          <Alert variant="warning" title="No academic structure yet">
            Create a program and class under Academic structure first, then
            enroll this student.
          </Alert>
        ) : null}
        <FormField label="Program / course" required error={formState.errors.programId?.message}>
          <Select {...register("programId")}>
            <option value="">Select a program…</option>
            {(programsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Class / batch / section" required error={formState.errors.classId?.message}>
          <Select {...register("classId")} disabled={!programId}>
            <option value="">
              {programId ? "Select a class…" : "Choose a program first"}
            </option>
            {programClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.branchName} · {c.academicYearLabel}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Start date" required error={formState.errors.startsOn?.message}>
          <Input type="date" {...register("startsOn")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const transferSchema = z.object({
  toBranchId: z.string().min(1, "Select the destination branch."),
  effectiveOn: z.string().min(1, "Select the effective date."),
});
type TransferValues = z.infer<typeof transferSchema>;

function TransferDialog({
  orgId,
  student,
  open,
  onClose,
}: {
  orgId: string;
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { branches } = useTenant();
  const { refresh, toast } = useStudentMutations(orgId, student.id);
  const [confirming, setConfirming] = useState<TransferValues | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toBranchId: "",
      effectiveOn: new Date().toISOString().slice(0, 10),
    },
  });
  const mutation = useMutation({
    mutationFn: (v: TransferValues) => transferStudent(orgId, student.id, v),
    onSuccess: async () => {
      toast({ title: "Branch transfer completed", variant: "success" });
      setConfirming(null);
      await refresh();
      onClose();
    },
    onError: (error) => {
      setConfirming(null);
      applyApiFieldErrors(error, setError);
    },
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const destinations = branches.filter((b) => b.id !== student.branchId);

  return (
    <>
      <Dialog
        open={open && confirming === null}
        onClose={onClose}
        title="Transfer to another branch"
        description={`${student.fullName} is currently at ${student.branchName}.`}
        footer={
          <>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit((v) => setConfirming(v))}
              disabled={destinations.length === 0}
            >
              Review transfer
            </Button>
          </>
        }
      >
        <form
          noValidate
          onSubmit={handleSubmit((v) => setConfirming(v))}
          className="flex flex-col gap-4"
        >
          {errorInfo ? (
            <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
              {errorInfo.friendlyDescription}
            </Alert>
          ) : null}
          {destinations.length === 0 ? (
            <Alert variant="warning" title="No other branch available">
              You only have access to one branch, so there&apos;s nowhere to
              transfer this student to.
            </Alert>
          ) : (
            <>
              <FormField label="Destination branch" required error={formState.errors.toBranchId?.message}>
                <Select {...register("toBranchId")}>
                  <option value="">Select a branch…</option>
                  {destinations.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Effective date" required error={formState.errors.effectiveOn?.message}>
                <Input type="date" {...register("effectiveOn")} />
              </FormField>
            </>
          )}
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirming !== null}
        title="Confirm branch transfer"
        description={
          confirming
            ? `Transfer ${student.fullName} from ${student.branchName} to ${
                branches.find((b) => b.id === confirming.toBranchId)?.name ?? "the selected branch"
              } effective ${formatPlainDate(confirming.effectiveOn)}? Their branch history will record this move.`
            : undefined
        }
        confirmLabel="Transfer student"
        variant="primary"
        isConfirming={mutation.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && mutation.mutate(confirming)}
      />
    </>
  );
}
