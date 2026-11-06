"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  inviteStaff,
  listDepartments,
  listDesignations,
  listRoles,
  updateStaff,
  type StaffDetail,
} from "@/api/services/staff";
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
import { useForm } from "react-hook-form";
import { z } from "zod";

export const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the staff member's name."),
  email: emailSchema,
  branchId: z.string().min(1, "Select a branch."),
  departmentId: z.string(),
  designationId: z.string(),
  roleKey: z.string().min(1, "Select a role."),
});
type InviteValues = z.infer<typeof inviteStaffSchema>;

export function InviteStaffDialog({
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
  const { register, handleSubmit, setError, reset, formState } =
    useForm<InviteValues>({ resolver: zodResolver(inviteStaffSchema) });

  const rolesQuery = useQuery({
    queryKey: queryKeys.staff.roles(orgId),
    queryFn: () => listRoles(orgId),
    enabled: open && Boolean(orgId),
  });
  const departmentsQuery = useQuery({
    queryKey: queryKeys.staff.departments(orgId),
    queryFn: () => listDepartments(orgId),
    enabled: open && Boolean(orgId),
  });
  const designationsQuery = useQuery({
    queryKey: queryKeys.staff.designations(orgId),
    queryFn: () => listDesignations(orgId),
    enabled: open && Boolean(orgId),
  });

  useEffect(() => {
    if (open) {
      reset({
        fullName: "",
        email: "",
        branchId: currentBranch?.id ?? branches[0]?.id ?? "",
        departmentId: "",
        designationId: "",
        roleKey: "teacher",
      });
    }
  }, [open, currentBranch, branches, reset]);

  const mutation = useMutation({
    mutationFn: (v: InviteValues) =>
      inviteStaff(orgId, {
        ...v,
        departmentId: v.departmentId || undefined,
        designationId: v.designationId || undefined,
      }),
    onSuccess: async (staff) => {
      toast({ title: `Invitation sent to ${staff.email}`, variant: "success" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.listRoot(orgId) });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite staff"
      description="They'll receive an email invitation. After accepting, they may need approval before becoming active."
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((v) => mutation.mutate(v))}
            isLoading={mutation.isPending}
          >
            Send invitation
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
        <FormField label="Full name" required error={formState.errors.fullName?.message}>
          <Input autoComplete="name" {...register("fullName")} />
        </FormField>
        <FormField label="Work email" required error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Branch" required error={formState.errors.branchId?.message}>
            <Select {...register("branchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Role" required error={formState.errors.roleKey?.message}>
            <Select {...register("roleKey")}>
              {(rolesQuery.data ?? []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department (optional)" error={formState.errors.departmentId?.message}>
            <Select {...register("departmentId")}>
              <option value="">Unassigned</option>
              {(departmentsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Designation (optional)" error={formState.errors.designationId?.message}>
            <Select {...register("designationId")}>
              <option value="">Unassigned</option>
              {(designationsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}

export const editStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the staff member's name."),
  phone: z.string().trim(),
  departmentId: z.string(),
  designationId: z.string(),
});
type EditValues = z.infer<typeof editStaffSchema>;

export function EditStaffDialog({
  staff,
  open,
  onClose,
}: {
  staff: StaffDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, reset, formState } =
    useForm<EditValues>({ resolver: zodResolver(editStaffSchema) });

  const departmentsQuery = useQuery({
    queryKey: queryKeys.staff.departments(orgId),
    queryFn: () => listDepartments(orgId),
    enabled: open && Boolean(orgId),
  });
  const designationsQuery = useQuery({
    queryKey: queryKeys.staff.designations(orgId),
    queryFn: () => listDesignations(orgId),
    enabled: open && Boolean(orgId),
  });

  useEffect(() => {
    if (open) {
      reset({
        fullName: staff.fullName,
        phone: staff.phone ?? "",
        departmentId: staff.departmentId ?? "",
        designationId: staff.designationId ?? "",
      });
    }
  }, [open, staff, reset]);

  const mutation = useMutation({
    mutationFn: (v: EditValues) =>
      updateStaff(orgId, staff.id, {
        ...v,
        phone: v.phone || undefined,
        departmentId: v.departmentId || undefined,
        designationId: v.designationId || undefined,
      }),
    onSuccess: async () => {
      toast({ title: "Staff profile updated", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.listRoot(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(orgId, staff.id) }),
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
      title={`Edit ${staff.fullName}`}
      description={`${staff.staffCode} · ${staff.email}`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Save changes
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
        <FormField label="Full name" required error={formState.errors.fullName?.message}>
          <Input autoComplete="name" {...register("fullName")} />
        </FormField>
        <FormField label="Phone (optional)" error={formState.errors.phone?.message}>
          <Input type="tel" {...register("phone")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department" error={formState.errors.departmentId?.message}>
            <Select {...register("departmentId")}>
              <option value="">Unassigned</option>
              {(departmentsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Designation" error={formState.errors.designationId?.message}>
            <Select {...register("designationId")}>
              <option value="">Unassigned</option>
              {(designationsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
