"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { listClasses, listPrograms } from "@/api/services/academics";
import {
  createStudent,
  updateStudent,
  type StudentDetail,
} from "@/api/services/students";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || emailSchema.safeParse(v).success, "Enter a valid email address.");

export const addStudentSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the student's full name."),
    dateOfBirth: z.string().min(1, "Select a date of birth."),
    gender: z.string(),
    email: optionalEmail,
    phone: z.string().trim(),
    branchId: z.string().min(1, "Select a branch."),
    programId: z.string(),
    classId: z.string(),
    enrollmentStartDate: z.string(),
  })
  .refine((v) => !v.classId || Boolean(v.programId), {
    path: ["classId"],
    message: "Choose a program before a class.",
  });

type AddValues = z.infer<typeof addStudentSchema>;

export function AddStudentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { currentOrganization, branches, currentBranch } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phone: "",
      branchId: currentBranch?.id ?? branches[0]?.id ?? "",
      programId: "",
      classId: "",
      enrollmentStartDate: new Date().toISOString().slice(0, 10),
    },
  });
  const { register, handleSubmit, setError, reset, formState } = form;
  const programId = useWatch({ control: form.control, name: "programId" });

  useEffect(() => {
    if (open) {
      reset({
        fullName: "",
        dateOfBirth: "",
        gender: "",
        email: "",
        phone: "",
        branchId: currentBranch?.id ?? branches[0]?.id ?? "",
        programId: "",
        classId: "",
        enrollmentStartDate: new Date().toISOString().slice(0, 10),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
  const branchClasses = (classesQuery.data ?? []).filter(
    (c) => c.programId === programId,
  );

  const mutation = useMutation({
    mutationFn: (values: AddValues) =>
      createStudent(orgId, {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        branchId: values.branchId,
        programId: values.programId || undefined,
        classId: values.classId || undefined,
        enrollmentStartDate: values.enrollmentStartDate || undefined,
      }),
    onSuccess: async (student) => {
      toast({ title: `${student.fullName} added`, variant: "success" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.root(orgId) });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const hasStructure = (programsQuery.data?.length ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add student"
      description="Creates an active student record. You can enroll them right away or later from their profile."
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending}
          >
            Add student
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="flex flex-col gap-4"
      >
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Full name" required error={formState.errors.fullName?.message}>
          <Input autoComplete="name" {...register("fullName")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date of birth" required error={formState.errors.dateOfBirth?.message}>
            <Input type="date" {...register("dateOfBirth")} />
          </FormField>
          <FormField label="Gender (optional)" error={formState.errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">Not specified</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email (optional)" error={formState.errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField label="Phone (optional)" error={formState.errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </FormField>
        </div>
        <FormField label="Branch" required error={formState.errors.branchId?.message}>
          <Select {...register("branchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        {hasStructure ? (
          <>
            <FormField
              label="Program (optional initial enrollment)"
              error={formState.errors.programId?.message}
            >
              <Select {...register("programId")}>
                <option value="">Enroll later</option>
                {(programsQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {programId ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Class / batch" error={formState.errors.classId?.message}>
                  <Select {...register("classId")}>
                    <option value="">Select a class…</option>
                    {branchClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.branchName}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="Enrollment start date"
                  error={formState.errors.enrollmentStartDate?.message}
                >
                  <Input type="date" {...register("enrollmentStartDate")} />
                </FormField>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">
            No programs exist yet — the student will be created unenrolled.
            Add programs/classes under Academic structure to enroll them.
          </p>
        )}
      </form>
    </Dialog>
  );
}

export const editStudentSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the student's full name."),
  dateOfBirth: z.string().min(1, "Select a date of birth."),
  gender: z.string(),
  email: optionalEmail,
  phone: z.string().trim(),
  address: z.string().trim(),
});

type EditValues = z.infer<typeof editStudentSchema>;

export function EditStudentDialog({
  student,
  open,
  onClose,
}: {
  student: StudentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, reset, formState } =
    useForm<EditValues>({ resolver: zodResolver(editStudentSchema) });

  useEffect(() => {
    if (open) {
      reset({
        fullName: student.fullName,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        address: student.address ?? "",
      });
    }
  }, [open, student, reset]);

  const mutation = useMutation({
    mutationFn: (values: EditValues) =>
      updateStudent(orgId, student.id, {
        ...values,
        gender: values.gender || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
      }),
    onSuccess: async () => {
      toast({ title: "Profile updated", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.students.root(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(orgId, student.id) }),
      ]);
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit ${student.fullName}`}
      description={`${student.studentCode} · ${student.branchName}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="flex flex-col gap-4"
      >
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Full name" required error={formState.errors.fullName?.message}>
          <Input autoComplete="name" {...register("fullName")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date of birth" required error={formState.errors.dateOfBirth?.message}>
            <Input type="date" {...register("dateOfBirth")} />
          </FormField>
          <FormField label="Gender (optional)" error={formState.errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">Not specified</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email (optional)" error={formState.errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField label="Phone (optional)" error={formState.errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </FormField>
        </div>
        <FormField label="Address (optional)" error={formState.errors.address?.message}>
          <Input {...register("address")} />
        </FormField>
      </form>
    </Dialog>
  );
}
