"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  approveStaff,
  assignBranch,
  assignRole,
  getStaff,
  listRoles,
  rejectStaff,
  removeBranch,
  removeRole,
  setStaffActive,
  STAFF_STATUS_LABELS,
  type StaffDetail,
} from "@/api/services/staff";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EditStaffDialog } from "@/components/staff/staff-forms";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatPlainDate } from "@/lib/datetime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const STATUS_VARIANT = { invited: "info", active: "success", inactive: "default" } as const;

export function StaffDetailView({ staffId }: { staffId: string }) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const query = useQuery({
    queryKey: queryKeys.staff.detail(orgId, staffId),
    queryFn: () => getStaff(orgId, staffId),
    enabled: Boolean(orgId),
  });

  if (query.isPending) return <PageLoading label="Loading staff member…" />;
  if (query.isError) {
    const info = normalizeApiError(query.error);
    if (info.status === 404 || info.code === "STAFF_NOT_FOUND") {
      return (
        <div className="mx-auto max-w-xl text-center">
          <h1>Staff member not found</h1>
          <p className="mt-3 text-muted">
            This staff record may have been removed, or the link is incorrect.
          </p>
          <p className="mt-5">
            <Link href={routes.portal.staff} className="font-medium text-primary underline">
              ← Back to staff
            </Link>
          </p>
        </div>
      );
    }
    if (info.isForbidden) {
      return (
        <div className="mx-auto max-w-xl">
          <Alert variant="error" title="You do not have permission to view this staff member">
            They belong to a branch you aren&apos;t authorized for. The backend
            enforces branch scope on every request.
          </Alert>
          <p className="mt-5">
            <Link href={routes.portal.staff} className="font-medium text-primary underline">
              ← Back to staff
            </Link>
          </p>
        </div>
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <StaffDetailBody staff={query.data} orgId={orgId} />;
}

type PendingAction =
  | { kind: "approve" | "reject" | "activate" | "deactivate" }
  | { kind: "removeRole"; roleKey: string; roleLabel: string }
  | null;

function StaffDetailBody({ staff, orgId }: { staff: StaffDetail; orgId: string }) {
  const { currentOrganization, branches } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [newRole, setNewRole] = useState("");
  const [newBranch, setNewBranch] = useState("");

  const canManageRoles =
    currentOrganization?.role === "owner" ||
    currentOrganization?.role === "general_manager";

  const rolesQuery = useQuery({
    queryKey: queryKeys.staff.roles(orgId),
    queryFn: () => listRoles(orgId),
    enabled: Boolean(orgId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(orgId, staff.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.listRoot(orgId) }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (a: NonNullable<PendingAction>) => {
      switch (a.kind) {
        case "approve":
          return approveStaff(orgId, staff.id);
        case "reject":
          return rejectStaff(orgId, staff.id);
        case "activate":
          return setStaffActive(orgId, staff.id, true);
        case "deactivate":
          return setStaffActive(orgId, staff.id, false);
        case "removeRole":
          return removeRole(orgId, staff.id, a.roleKey);
      }
    },
    onSuccess: async () => {
      toast({ title: "Done", variant: "success" });
      setPending(null);
      await refresh();
    },
    onError: () => setPending(null),
  });

  const addRole = useMutation({
    mutationFn: (roleKey: string) => assignRole(orgId, staff.id, roleKey),
    onSuccess: async () => {
      toast({ title: "Role assigned", variant: "success" });
      setNewRole("");
      await refresh();
    },
  });
  const addBranch = useMutation({
    mutationFn: (branchId: string) => assignBranch(orgId, staff.id, branchId),
    onSuccess: async () => {
      toast({ title: "Branch assigned", variant: "success" });
      setNewBranch("");
      await refresh();
    },
  });
  const dropBranch = useMutation({
    mutationFn: (branchId: string) => removeBranch(orgId, staff.id, branchId),
    onSuccess: async () => {
      toast({ title: "Branch removed", variant: "success" });
      await refresh();
    },
  });

  const anyError = action.error ?? addRole.error ?? addBranch.error ?? dropBranch.error;
  const errorInfo = anyError ? normalizeApiError(anyError) : null;

  const unassignedRoles = (rolesQuery.data ?? []).filter(
    (r) => !staff.roles.some((x) => x.key === r.key),
  );
  const unassignedBranches = branches.filter((b) => !staff.branchIds.includes(b.id));
  const att = staff.attendanceSummary;

  return (
    <div className="flex flex-col gap-5">
      <p>
        <Link href={routes.portal.staff} className="text-sm font-medium text-primary underline">
          ← All staff
        </Link>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground"
          >
            {staff.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")}
          </span>
          <div>
            <h1>{staff.fullName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
              <span className="font-mono">{staff.staffCode}</span> · {staff.email}
              <Badge variant={STATUS_VARIANT[staff.status]}>
                {STAFF_STATUS_LABELS[staff.status]}
              </Badge>
              {staff.approvalState === "pending" ? (
                <Badge variant="warning">Pending approval</Badge>
              ) : null}
              {staff.isSelf ? <Badge variant="info">You</Badge> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
          {staff.approvalState === "pending" ? (
            <>
              <Button onClick={() => setPending({ kind: "approve" })}>Approve</Button>
              <Button variant="subtle" onClick={() => setPending({ kind: "reject" })}>
                Reject
              </Button>
            </>
          ) : staff.status === "active" ? (
            <Button
              variant="subtle"
              disabled={staff.isSelf}
              title={staff.isSelf ? "You can't deactivate your own account" : undefined}
              onClick={() => setPending({ kind: "deactivate" })}
            >
              Deactivate
            </Button>
          ) : staff.status === "inactive" ? (
            <Button onClick={() => setPending({ kind: "activate" })}>Activate</Button>
          ) : null}
        </div>
      </div>

      {errorInfo ? (
        <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
          {errorInfo.friendlyDescription}
        </Alert>
      ) : null}

      {staff.status === "invited" && staff.approvalState !== "pending" ? (
        <Alert variant="info" title="Invitation sent">
          Invited {staff.invitedAt ? `on ${formatPlainDate(staff.invitedAt.slice(0, 10))}` : ""} —
          waiting for them to accept via the email link. Access starts only
          after acceptance (and approval, where required).
        </Alert>
      ) : null}
      {staff.approvalState === "pending" ? (
        <Alert variant="warning" title="Awaiting approval">
          This invitee accepted their invitation and is waiting for approval
          before they can sign in.
        </Alert>
      ) : null}
      {staff.approvalState === "rejected" ? (
        <Alert variant="warning" title="Invitation rejected">
          This person&apos;s approval was rejected. They have no portal access.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted">Primary branch</dt>
              <dd>{staff.primaryBranchName}</dd>
              <dt className="text-muted">Department</dt>
              <dd>{staff.departmentName ?? "Unassigned"}</dd>
              <dt className="text-muted">Designation</dt>
              <dd>{staff.designationName ?? "Unassigned"}</dd>
              <dt className="text-muted">Phone</dt>
              <dd>{staff.phone ?? "—"}</dd>
              <dt className="text-muted">Joined</dt>
              <dd>{staff.joinedOn ? formatPlainDate(staff.joinedOn) : "—"}</dd>
              <dt className="text-muted">Activation</dt>
              <dd>{STAFF_STATUS_LABELS[staff.status]}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance summary · last {att.periodDays} days</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Attendance" value={`${att.attendancePercent}%`} />
              <MetricCard label="Present days" value={String(att.presentDays)} />
              <MetricCard label="Late days" value={String(att.lateDays)} />
              <MetricCard label="Absent / leave" value={`${att.absentDays} / ${att.leaveDays}`} />
            </div>
            <p className="mt-3 text-sm text-muted">
              Computed by the backend from punches and approved leave.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles &amp; permissions</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col gap-2">
              {staff.roles.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3">
                  <Badge variant="info">{r.label}</Badge>
                  {canManageRoles ? (
                    <Button
                      variant="subtle"
                      onClick={() =>
                        setPending({ kind: "removeRole", roleKey: r.key, roleLabel: r.label })
                      }
                      aria-label={`Remove ${r.label} role`}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
              {staff.roles.length === 0 ? (
                <li className="text-sm text-muted">No roles assigned.</li>
              ) : null}
            </ul>
            {canManageRoles ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newRole) addRole.mutate(newRole);
                }}
              >
                <label className="sr-only" htmlFor="add-role">
                  Add a role
                </label>
                <Select id="add-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="">Add a role…</option>
                  {unassignedRoles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" disabled={!newRole} isLoading={addRole.isPending}>
                  Assign role
                </Button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Only Owners and General Managers can change roles. (The backend
                enforces this — attempts return “You are not allowed to change
                this user&apos;s role.”)
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branch assignments</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col gap-2">
              {staff.branchIds.map((branchId, i) => (
                <li key={branchId} className="flex items-center justify-between gap-3">
                  <span>
                    {staff.branchNames[i] ?? branchId}
                    {branchId === staff.primaryBranchId ? (
                      <Badge variant="default" className="ml-2">
                        Primary
                      </Badge>
                    ) : null}
                  </span>
                  <Button
                    variant="subtle"
                    onClick={() => dropBranch.mutate(branchId)}
                    disabled={staff.branchIds.length <= 1}
                    aria-label={`Remove ${staff.branchNames[i] ?? branchId} assignment`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newBranch) addBranch.mutate(newBranch);
              }}
            >
              <label className="sr-only" htmlFor="add-branch">
                Add a branch
              </label>
              <Select id="add-branch" value={newBranch} onChange={(e) => setNewBranch(e.target.value)}>
                <option value="">Add a branch…</option>
                {unassignedBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" disabled={!newBranch} isLoading={addBranch.isPending}>
                Assign branch
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <EditStaffDialog staff={staff} open={editOpen} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === "approve"
            ? `Approve ${staff.fullName}?`
            : pending?.kind === "reject"
              ? `Reject ${staff.fullName}?`
              : pending?.kind === "activate"
                ? `Activate ${staff.fullName}?`
                : pending?.kind === "deactivate"
                  ? `Deactivate ${staff.fullName}?`
                  : pending?.kind === "removeRole"
                    ? `Remove the ${pending.roleLabel} role?`
                    : ""
        }
        description={
          pending?.kind === "approve"
            ? "They'll become an active staff member and can sign in with their assigned role."
            : pending?.kind === "reject"
              ? "They will not get portal access. This is recorded on their staff record."
              : pending?.kind === "activate"
                ? "They'll regain portal access with their existing roles."
                : pending?.kind === "deactivate"
                  ? "They'll lose portal access immediately. Their history is preserved and they can be reactivated."
                  : pending?.kind === "removeRole"
                    ? pending.roleKey === "owner" || pending.roleKey === "general_manager"
                      ? `Warning: removing ${pending.roleLabel} is an impactful change — ${staff.fullName} will lose organization-wide administration access immediately.`
                      : `${staff.fullName} will lose the permissions of the ${pending.roleLabel} role.`
                    : ""
        }
        confirmLabel={
          pending?.kind === "approve"
            ? "Approve staff"
            : pending?.kind === "reject"
              ? "Reject"
              : pending?.kind === "activate"
                ? "Activate"
                : pending?.kind === "deactivate"
                  ? "Deactivate"
                  : "Remove role"
        }
        variant={pending?.kind === "approve" || pending?.kind === "activate" ? "primary" : "destructive"}
        isConfirming={action.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && action.mutate(pending)}
      />
    </div>
  );
}
