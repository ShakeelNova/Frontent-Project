"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
  listDevices,
  registerDevice,
  removeDevice,
  updateDevice,
  type Device,
  type DeviceStatus,
  type DeviceType,
} from "@/api/services/devices";
import { getOrgPreferences } from "@/api/services/setup";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTimeInZone } from "@/lib/datetime";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/**
 * Status is rendered EXACTLY as the API reports it. A device only shows
 * green/"Verified" when the backend says verified — K50/biometric units
 * stay "Not configured"/"Pending verification" until a real connector
 * verification exists server-side.
 */
const STATUS_VARIANT: Record<DeviceStatus, "success" | "warning" | "error" | "default"> = {
  verified: "success",
  pending_verification: "warning",
  offline: "error",
  not_configured: "default",
};

export function DevicesPanel() {
  const { currentOrganization, branches } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Device | null>(null);

  const query = useQuery({
    queryKey: queryKeys.devices.list(orgId),
    queryFn: () => listDevices(orgId),
    enabled: Boolean(orgId),
  });
  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.devices.list(orgId) });

  const update = useMutation({
    mutationFn: (args: { id: string; branchId?: string; mode?: Device["mode"] }) =>
      updateDevice(orgId, args.id, { branchId: args.branchId, mode: args.mode }),
    onSuccess: async () => {
      toast({ title: "Device updated", variant: "success" });
      await invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeDevice(orgId, id),
    onSuccess: async () => {
      toast({ title: "Device removed", variant: "success" });
      setRemoveTarget(null);
      await invalidate();
    },
    onError: () => setRemoveTarget(null),
  });
  const anyError = update.error ?? remove.error;
  const errorInfo = anyError ? normalizeApiError(anyError) : null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Devices</h1>
          <p className="mt-1 text-muted">
            {currentOrganization?.name} · Registered attendance hardware.
            Status comes from the backend device registry — a device is
            only &ldquo;Verified&rdquo; when the backend has actually verified it.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>Register device</Button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Alert variant="info" title="Attendance works without devices">
          Manual marking and QR check-in sessions are fully usable even if
          every device below is unconfigured.{" "}
          <Link href={routes.portal.attendance} className="font-medium underline">
            Open attendance
          </Link>
          .
        </Alert>

        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}

        {query.isPending ? (
          <div role="status" aria-label="Loading devices" className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No devices registered"
            description="Nothing is blocked: use manual attendance or QR check-in sessions. Register hardware here when you have it — new devices start as “Not configured” until the backend verifies them."
            action={<Button onClick={() => setRegisterOpen(true)}>Register device</Button>}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {query.data.map((device) => (
              <li key={device.id}>
                <Card>
                  <CardHeader className="flex items-start justify-between gap-3">
                    <CardTitle>{device.name}</CardTitle>
                    <Badge variant={STATUS_VARIANT[device.status]}>
                      {DEVICE_STATUS_LABELS[device.status]}
                    </Badge>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted">Type</dt>
                      <dd>{DEVICE_TYPE_LABELS[device.type]}</dd>
                      <dt className="text-muted">Device ID</dt>
                      <dd className="font-mono">{device.id}</dd>
                      <dt className="text-muted">Last heartbeat</dt>
                      <dd>
                        {device.lastHeartbeatUtc
                          ? formatDateTimeInZone(device.lastHeartbeatUtc, timezone)
                          : "Never seen"}
                      </dd>
                    </dl>
                    {device.type === "biometric_k50" && device.status !== "verified" ? (
                      <p className="rounded-md bg-surface-raised px-3 py-2 text-sm text-muted">
                        K50 connector: {DEVICE_STATUS_LABELS[device.status].toLowerCase()}.
                        This unit is not verified by the backend yet, so it
                        isn&apos;t used for punches. QR/manual attendance remains
                        available.
                      </p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`dev-branch-${device.id}`} className="mb-1.5 block text-sm font-medium">
                          Branch
                        </label>
                        <Select
                          id={`dev-branch-${device.id}`}
                          value={device.branchId ?? ""}
                          onChange={(e) =>
                            update.mutate({ id: device.id, branchId: e.target.value })
                          }
                        >
                          <option value="">Unassigned</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor={`dev-mode-${device.id}`} className="mb-1.5 block text-sm font-medium">
                          Mode
                        </label>
                        <Select
                          id={`dev-mode-${device.id}`}
                          value={device.mode}
                          onChange={(e) =>
                            update.mutate({ id: device.id, mode: e.target.value as Device["mode"] })
                          }
                        >
                          <option value="student">Students</option>
                          <option value="staff">Staff</option>
                          <option value="both">Both</option>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Button
                        variant="subtle"
                        onClick={() => setRemoveTarget(device)}
                        aria-label={`Remove ${device.name}`}
                      >
                        Remove device
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {registerOpen ? (
        <RegisterDeviceDialog orgId={orgId} onClose={() => setRegisterOpen(false)} />
      ) : null}

      <ConfirmDialog
        open={removeTarget !== null}
        title={`Remove ${removeTarget?.name ?? "device"}?`}
        description="The device will be unregistered. Attendance history already recorded is preserved."
        confirmLabel="Remove device"
        isConfirming={remove.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && remove.mutate(removeTarget.id)}
      />
    </div>
  );
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Give the device a name."),
  type: z.enum(["qr_station", "biometric_k50", "tablet"]),
  branchId: z.string().min(1, "Select a branch."),
});
type RegisterValues = z.infer<typeof registerSchema>;

function RegisterDeviceDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { branches, currentBranch } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      type: "qr_station",
      branchId: currentBranch?.id ?? branches[0]?.id ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (v: RegisterValues) => registerDevice(orgId, v),
    onSuccess: async () => {
      toast({
        title: "Device registered — status: Not configured",
        description: "It stays unconfigured until the backend verifies it.",
        variant: "success",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices.list(orgId) });
      onClose();
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Register a device"
      description="New devices always start as “Not configured”. Verification happens through the backend connector — never assume a device is connected."
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} isLoading={mutation.isPending}>
            Register device
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
        <FormField label="Device name" required error={formState.errors.name?.message}>
          <Input placeholder="e.g. Main gate QR station" {...register("name")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" required error={formState.errors.type?.message}>
            <Select {...register("type")}>
              {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((t) => (
                <option key={t} value={t}>
                  {DEVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Branch" required error={formState.errors.branchId?.message}>
            <Select {...register("branchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
