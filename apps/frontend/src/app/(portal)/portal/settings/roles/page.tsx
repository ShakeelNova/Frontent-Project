"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  getRolesPermissions,
  updateRolePermissions,
  type RolePermissions,
} from "@/api/services/settings";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Roles & permissions (Phase 7). The catalog and role metadata are
 * backend-provided; edits are saved through the API, which remains the
 * authorization authority. Removing permissions asks for confirmation —
 * people with the role lose access immediately.
 */
export default function RolesPermissionsPage() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.settings.rolesPermissions(orgId),
    queryFn: () => getRolesPermissions(orgId),
    enabled: Boolean(orgId),
  });

  const roles = query.data?.roles ?? [];
  const selected: RolePermissions | null =
    roles.find((r) => r.roleKey === selectedKey) ?? roles[0] ?? null;
  const effectiveDraft = draft ?? selected?.permissions ?? {};
  const dirty = useMemo(() => {
    if (!selected || !draft) return false;
    return Object.keys(draft).some((k) => draft[k] !== selected.permissions[k]);
  }, [draft, selected]);
  const removedCount = useMemo(() => {
    if (!selected || !draft) return 0;
    return Object.keys(draft).filter((k) => selected.permissions[k] && !draft[k]).length;
  }, [draft, selected]);

  const mutation = useMutation({
    mutationFn: () => updateRolePermissions(orgId, selected!.roleKey, effectiveDraft),
    onSuccess: async (data) => {
      toast({ title: `${selected!.roleLabel} permissions saved`, variant: "success" });
      setDraft(null);
      setConfirmSave(false);
      queryClient.setQueryData(queryKeys.settings.rolesPermissions(orgId), data);
    },
    onError: () => setConfirmSave(false),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string }[]>();
    for (const p of query.data?.catalog ?? []) {
      const list = map.get(p.group) ?? [];
      list.push({ key: p.key, label: p.label });
      map.set(p.group, list);
    }
    return [...map.entries()];
  }, [query.data]);

  return (
    <section aria-labelledby="roles-heading">
      <h2 id="roles-heading" className="text-h4">
        Roles &amp; permissions
      </h2>
      <p className="mt-1 text-sm text-muted">
        What each role may do, as defined by the backend. To give a person a
        role, open their profile in the{" "}
        <Link href={routes.portal.staff} className="font-medium text-primary underline">
          staff directory
        </Link>
        .
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}

        {query.isPending ? (
          <div role="status" aria-label="Loading roles" className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : selected ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64">
                <label htmlFor="role-select" className="mb-1.5 block text-sm font-medium">
                  Role
                </label>
                <Select
                  id="role-select"
                  value={selected.roleKey}
                  onChange={(e) => {
                    setSelectedKey(e.target.value);
                    setDraft(null);
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.roleKey} value={r.roleKey}>
                      {r.roleLabel} ({r.memberCount} member{r.memberCount === 1 ? "" : "s"})
                    </option>
                  ))}
                </Select>
              </div>
              {selected.system ? (
                <Badge variant="warning">System role — locked by the backend</Badge>
              ) : dirty ? (
                <span className="font-medium text-warning-foreground">Unsaved changes</span>
              ) : null}
            </div>

            {removedCount > 0 ? (
              <Alert variant="warning" title="Access will be removed">
                Saving removes {removedCount} permission(s) from everyone with
                the {selected.roleLabel} role, effective immediately.
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(([group, perms]) => (
                <fieldset
                  key={group}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <legend className="px-1 text-sm font-semibold">{group}</legend>
                  <ul className="flex flex-col gap-2">
                    {perms.map((p) => (
                      <li key={p.key}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(effectiveDraft[p.key])}
                            disabled={selected.system}
                            onChange={(e) =>
                              setDraft({
                                ...effectiveDraft,
                                [p.key]: e.target.checked,
                              })
                            }
                          />
                          {p.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </div>

            {!selected.system ? (
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    removedCount > 0 ? setConfirmSave(true) : mutation.mutate()
                  }
                  isLoading={mutation.isPending}
                  disabled={!dirty}
                >
                  Save permissions
                </Button>
                <Button
                  variant="subtle"
                  disabled={!dirty || mutation.isPending}
                  onClick={() => setDraft(null)}
                >
                  Discard changes
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">
                The Owner role always has full access and can&apos;t be edited
                here.
              </p>
            )}
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmSave}
        title={`Remove access from ${selected?.roleLabel ?? "this role"}?`}
        description={`${removedCount} permission(s) will be removed for everyone with this role, effective immediately.`}
        confirmLabel="Save anyway"
        isConfirming={mutation.isPending}
        onCancel={() => setConfirmSave(false)}
        onConfirm={() => mutation.mutate()}
      />
    </section>
  );
}
