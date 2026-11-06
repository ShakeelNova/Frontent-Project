"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { listPrograms } from "@/api/services/academics";
import {
  createFeeStructure,
  generateVouchers,
  listFeeStructures,
  updateFeeStructure,
  type FeeStructure,
} from "@/api/services/fees";
import { getOrgPreferences } from "@/api/services/setup";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatMoney, minorToMajorInput, parseMajorToMinor } from "@/lib/money";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StructuresPanel() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeStructure | null>(null);
  const [generateTarget, setGenerateTarget] = useState<FeeStructure | null>(null);

  const query = useQuery({
    queryKey: queryKeys.fees.structures(orgId),
    queryFn: () => listFeeStructures(orgId),
    enabled: Boolean(orgId),
  });

  return (
    <section aria-labelledby="fee-structures-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="fee-structures-heading" className="text-h4">
            Fee structures
          </h2>
          <p className="mt-1 text-sm text-muted">
            A structure is a named set of fee components for a program.
            Generate vouchers from it each period — existing vouchers keep
            their original snapshot.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New fee structure</Button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {query.isPending ? (
          <div role="status" aria-label="Loading fee structures" className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            title="No fee structures yet"
            description="Create your first structure (tuition, lab, transport…) and generate vouchers for a period."
            action={<Button onClick={() => setCreateOpen(true)}>New fee structure</Button>}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {query.data.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardHeader className="flex items-start justify-between gap-3">
                    <CardTitle>{s.name}</CardTitle>
                    <Badge variant={s.isActive ? "success" : "default"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-3">
                    <p className="text-sm text-muted">Applies to: {s.appliesToLabel}</p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {s.components.map((c) => (
                        <li key={c.name} className="flex justify-between">
                          <span>{c.name}</span>
                          <span>{formatMoney(c.amountMinor, s.currency)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between border-t border-border pt-1 font-semibold">
                        <span>Total (per voucher)</span>
                        <span>{formatMoney(s.totalMinor, s.currency)}</span>
                      </li>
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="subtle" onClick={() => setEditTarget(s)}>
                        Edit
                      </Button>
                      <Button onClick={() => setGenerateTarget(s)}>Generate vouchers</Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <StructureDialog orgId={orgId} onClose={() => setCreateOpen(false)} />
      ) : null}
      {editTarget ? (
        <StructureDialog
          orgId={orgId}
          existing={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
      {generateTarget ? (
        <GenerateDialog
          orgId={orgId}
          structure={generateTarget}
          onClose={() => setGenerateTarget(null)}
        />
      ) : null}
    </section>
  );
}

function StructureDialog({
  orgId,
  existing,
  onClose,
}: {
  orgId: string;
  existing?: FeeStructure;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const programsQuery = useQuery({
    queryKey: queryKeys.academics.programs(orgId),
    queryFn: () => listPrograms(orgId),
    enabled: Boolean(orgId),
  });
  const currency = preferencesQuery.data?.currency ?? existing?.currency ?? "PKR";

  const [name, setName] = useState(existing?.name ?? "");
  const [programId, setProgramId] = useState(existing?.programId ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [components, setComponents] = useState<{ name: string; amount: string }[]>(
    existing
      ? existing.components.map((c) => ({
          name: c.name,
          amount: minorToMajorInput(c.amountMinor, existing.currency),
        }))
      : [{ name: "Tuition", amount: "" }],
  );
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = components.map((c) => ({
        name: c.name.trim(),
        amountMinor: parseMajorToMinor(c.amount, currency),
      }));
      if (!name.trim()) throw new Error("Give the structure a name.");
      if (parsed.some((c) => !c.name || c.amountMinor === null || c.amountMinor <= 0)) {
        throw new Error("Every component needs a name and an amount greater than zero.");
      }
      const input = {
        name: name.trim(),
        programId: programId || null,
        isActive,
        components: parsed.map((c) => ({ name: c.name, amountMinor: c.amountMinor! })),
      };
      return existing
        ? updateFeeStructure(orgId, existing.id, input)
        : createFeeStructure(orgId, input);
    },
    onSuccess: async () => {
      toast({
        title: existing ? "Fee structure updated" : "Fee structure created",
        variant: "success",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fees.structures(orgId) });
      onClose();
    },
    onError: (error) =>
      setFormError(
        error instanceof Error && !("status" in error)
          ? error.message
          : normalizeApiError(error).friendlyDescription,
      ),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? "Edit fee structure" : "New fee structure"}
      description={`Amounts in ${currency} (your organization's currency). Editing a structure doesn't change vouchers already issued.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            {existing ? "Save changes" : "Create structure"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="error" title="Check the form">
            {formError}
          </Alert>
        ) : null}
        <FormField label="Structure name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Matric Science — monthly"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Applies to program">
            <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">All programs</option>
              {(programsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={isActive ? "active" : "inactive"}
              onChange={(e) => setIsActive(e.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Components</legend>
          <div className="flex flex-col gap-2">
            {components.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Component ${i + 1} name`}
                  placeholder="e.g. Tuition"
                  value={c.name}
                  onChange={(e) =>
                    setComponents((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  aria-label={`Component ${i + 1} amount`}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="w-36"
                  value={c.amount}
                  onChange={(e) =>
                    setComponents((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  variant="subtle"
                  aria-label={`Remove component ${i + 1}`}
                  disabled={components.length === 1}
                  onClick={() =>
                    setComponents((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="subtle"
            className="mt-2"
            onClick={() => setComponents((prev) => [...prev, { name: "", amount: "" }])}
          >
            Add component
          </Button>
        </fieldset>
      </div>
    </Dialog>
  );
}

function GenerateDialog({
  orgId,
  structure,
  onClose,
}: {
  orgId: string;
  structure: FeeStructure;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [periodLabel, setPeriodLabel] = useState("");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      generateVouchers(orgId, structure.id, { periodLabel: periodLabel.trim(), dueDate }),
    onSuccess: async (result) => {
      toast({
        title: `${result.created} voucher(s) generated`,
        description: result.skippedExisting
          ? `${result.skippedExisting} student(s) already had a voucher for this period.`
          : undefined,
        variant: "success",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fees.vouchersRoot(orgId) });
      onClose();
      router.push(routes.portal.feesVouchers);
    },
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Generate vouchers — ${structure.name}`}
      description={`This creates one voucher per active student it applies to (${structure.appliesToLabel}), ${formatMoney(structure.totalMinor, structure.currency)} each, for the period below. Students who already have one for the period are skipped, and existing vouchers/payments are never altered.`}
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!periodLabel.trim() || !dueDate}
          >
            Generate vouchers
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <FormField label="Period label" required>
          <Input
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="e.g. Nov 2026"
          />
        </FormField>
        <FormField label="Due date" required>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
      </div>
    </Dialog>
  );
}
