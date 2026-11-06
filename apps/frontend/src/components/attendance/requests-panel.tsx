"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  decideCorrection,
  decideLeave,
  listCorrectionRequests,
  listLeaveRequests,
  submitCorrection,
  submitLeave,
  type CorrectionRequest,
  type LeaveRequest,
  type RequestStatus,
} from "@/api/services/attendance";
import { listStaff } from "@/api/services/staff";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const STATUS_VARIANT: Record<RequestStatus, "warning" | "success" | "error"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

type Tab = "corrections" | "leave";

export function RequestsPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const [tab, setTab] = useState<Tab>("corrections");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="requests-heading" className="text-h4">
            Corrections &amp; leave requests
          </h2>
          <p className="mt-1 text-sm text-muted">
            Staff (or managers on their behalf) submit requests; managers
            approve or reject with confirmation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setCorrectionOpen(true)}>
            Request correction
          </Button>
          <Button onClick={() => setLeaveOpen(true)}>Request leave</Button>
        </div>
      </div>

      <div role="tablist" aria-label="Request type" className="mt-5 flex gap-2">
        {(
          [
            ["corrections", "Corrections"],
            ["leave", "Leave"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3.5 py-2 text-sm font-medium",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-surface-raised",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "corrections" ? <CorrectionsList orgId={orgId} /> : <LeavesList orgId={orgId} />}
      </div>

      {correctionOpen ? (
        <CorrectionDialog orgId={orgId} onClose={() => setCorrectionOpen(false)} />
      ) : null}
      {leaveOpen ? <LeaveDialog orgId={orgId} onClose={() => setLeaveOpen(false)} /> : null}
    </section>
  );
}

function DecisionButtons({
  onDecide,
  disabled,
}: {
  onDecide: (d: "approved" | "rejected") => void;
  disabled: boolean;
}) {
  return (
    <span className="flex gap-2">
      <Button variant="subtle" disabled={disabled} onClick={() => onDecide("approved")}>
        Approve
      </Button>
      <Button variant="subtle" disabled={disabled} onClick={() => onDecide("rejected")}>
        Reject
      </Button>
    </span>
  );
}

function CorrectionsList({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{ req: CorrectionRequest; decision: "approved" | "rejected" } | null>(null);
  const query = useQuery({
    queryKey: queryKeys.attendance.corrections(orgId),
    queryFn: () => listCorrectionRequests(orgId),
    enabled: Boolean(orgId),
  });
  const decide = useMutation({
    mutationFn: (args: { id: string; decision: "approved" | "rejected" }) =>
      decideCorrection(orgId, args.id, args.decision),
    onSuccess: async (list) => {
      toast({ title: "Correction decision saved", variant: "success" });
      setConfirm(null);
      queryClient.setQueryData(queryKeys.attendance.corrections(orgId), list);
    },
    onError: () => setConfirm(null),
  });
  const errorInfo = decide.isError ? normalizeApiError(decide.error) : null;

  if (query.isPending)
    return (
      <div role="status" aria-label="Loading correction requests">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0)
    return (
      <EmptyState
        title="No correction requests"
        description="When someone asks to fix a punch, it will show up here for a decision."
      />
    );

  return (
    <>
      {errorInfo ? (
        <div className="mb-4">
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {query.data.map((req) => (
          <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">
                {req.staffName} <span className="text-muted">· {req.branchName}</span>
              </p>
              <p className="text-sm text-muted">
                {formatPlainDate(req.date)}
                {req.correctedIn ? ` · in ${req.correctedIn}` : ""}
                {req.correctedOut ? ` · out ${req.correctedOut}` : ""} — {req.reason}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
              {req.status === "pending" ? (
                <DecisionButtons
                  disabled={decide.isPending}
                  onDecide={(decision) => setConfirm({ req, decision })}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        title={`${confirm?.decision === "approved" ? "Approve" : "Reject"} this correction?`}
        description={
          confirm
            ? `${confirm.req.staffName} · ${formatPlainDate(confirm.req.date)} — ${confirm.req.reason}`
            : undefined
        }
        confirmLabel={confirm?.decision === "approved" ? "Approve correction" : "Reject correction"}
        variant={confirm?.decision === "approved" ? "primary" : "destructive"}
        isConfirming={decide.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && decide.mutate({ id: confirm.req.id, decision: confirm.decision })}
      />
    </>
  );
}

function LeavesList({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{ req: LeaveRequest; decision: "approved" | "rejected" } | null>(null);
  const query = useQuery({
    queryKey: queryKeys.attendance.leaves(orgId),
    queryFn: () => listLeaveRequests(orgId),
    enabled: Boolean(orgId),
  });
  const decide = useMutation({
    mutationFn: (args: { id: string; decision: "approved" | "rejected" }) =>
      decideLeave(orgId, args.id, args.decision),
    onSuccess: async (list) => {
      toast({ title: "Leave decision saved", variant: "success" });
      setConfirm(null);
      queryClient.setQueryData(queryKeys.attendance.leaves(orgId), list);
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.staffRoot(orgId) });
    },
    onError: () => setConfirm(null),
  });
  const errorInfo = decide.isError ? normalizeApiError(decide.error) : null;

  if (query.isPending)
    return (
      <div role="status" aria-label="Loading leave requests">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0)
    return (
      <EmptyState
        title="No leave requests"
        description="Leave requests submitted by your team will show up here."
      />
    );

  return (
    <>
      {errorInfo ? (
        <div className="mb-4">
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {query.data.map((req) => (
          <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">
                {req.staffName} <span className="text-muted">· {req.branchName}</span>
              </p>
              <p className="text-sm text-muted">
                {formatPlainDate(req.from)} → {formatPlainDate(req.to)} — {req.reason}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
              {req.status === "pending" ? (
                <DecisionButtons
                  disabled={decide.isPending}
                  onDecide={(decision) => setConfirm({ req, decision })}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        title={`${confirm?.decision === "approved" ? "Approve" : "Reject"} this leave?`}
        description={
          confirm
            ? `${confirm.req.staffName} · ${formatPlainDate(confirm.req.from)} → ${formatPlainDate(confirm.req.to)} — ${confirm.req.reason}`
            : undefined
        }
        confirmLabel={confirm?.decision === "approved" ? "Approve leave" : "Reject leave"}
        variant={confirm?.decision === "approved" ? "primary" : "destructive"}
        isConfirming={decide.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && decide.mutate({ id: confirm.req.id, decision: confirm.decision })}
      />
    </>
  );
}

function useActiveStaffOptions(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.attendance.staffOptions(orgId),
    queryFn: async () => {
      const result = await listStaff(orgId, { page: 1, pageSize: 100, status: "active" });
      return result.items;
    },
    enabled: enabled && Boolean(orgId),
  });
}

const correctionSchema = z.object({
  staffId: z.string().min(1, "Select a staff member."),
  date: z.string().min(1, "Select the date."),
  correctedIn: z.string(),
  correctedOut: z.string(),
  reason: z.string().trim().min(3, "Give a short reason."),
});
type CorrectionValues = z.infer<typeof correctionSchema>;

function CorrectionDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const staffQuery = useActiveStaffOptions(orgId, true);
  const { register, handleSubmit, setError, formState } = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { staffId: "", date: "", correctedIn: "", correctedOut: "", reason: "" },
  });
  const mutation = useMutation({
    mutationFn: (v: CorrectionValues) =>
      submitCorrection(orgId, {
        ...v,
        correctedIn: v.correctedIn || undefined,
        correctedOut: v.correctedOut || undefined,
      }),
    onSuccess: async () => {
      toast({ title: "Correction requested", variant: "success" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.corrections(orgId) });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Request an attendance correction"
      description="Times are in the organization's timezone as shown on the attendance screens."
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Submit request
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
        <FormField label="Staff member" required error={formState.errors.staffId?.message}>
          <Select {...register("staffId")}>
            <option value="">Select a staff member…</option>
            {(staffQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} · {s.primaryBranchName}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Date" required error={formState.errors.date?.message}>
            <Input type="date" {...register("date")} />
          </FormField>
          <FormField label="Corrected in (optional)" error={formState.errors.correctedIn?.message}>
            <Input type="time" {...register("correctedIn")} />
          </FormField>
          <FormField label="Corrected out (optional)" error={formState.errors.correctedOut?.message}>
            <Input type="time" {...register("correctedOut")} />
          </FormField>
        </div>
        <FormField label="Reason" required error={formState.errors.reason?.message}>
          <Textarea rows={3} {...register("reason")} />
        </FormField>
      </form>
    </Dialog>
  );
}

const leaveSchema = z
  .object({
    staffId: z.string().min(1, "Select a staff member."),
    from: z.string().min(1, "Select a start date."),
    to: z.string().min(1, "Select an end date."),
    reason: z.string().trim().min(3, "Give a short reason."),
  })
  .refine((v) => v.from <= v.to, {
    path: ["to"],
    message: "End date must be on/after the start date.",
  });
type LeaveValues = z.infer<typeof leaveSchema>;

function LeaveDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const staffQuery = useActiveStaffOptions(orgId, true);
  const { register, handleSubmit, setError, formState } = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { staffId: "", from: "", to: "", reason: "" },
  });
  const mutation = useMutation({
    mutationFn: (v: LeaveValues) => submitLeave(orgId, v),
    onSuccess: async () => {
      toast({ title: "Leave requested", variant: "success" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendance.leaves(orgId) });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Request leave"
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Submit request
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
        <FormField label="Staff member" required error={formState.errors.staffId?.message}>
          <Select {...register("staffId")}>
            <option value="">Select a staff member…</option>
            {(staffQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} · {s.primaryBranchName}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="From" required error={formState.errors.from?.message}>
            <Input type="date" {...register("from")} />
          </FormField>
          <FormField label="To" required error={formState.errors.to?.message}>
            <Input type="date" {...register("to")} />
          </FormField>
        </div>
        <FormField label="Reason" required error={formState.errors.reason?.message}>
          <Textarea rows={3} {...register("reason")} />
        </FormField>
      </form>
    </Dialog>
  );
}
