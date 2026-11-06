"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  commitImport,
  createImport,
  discardImport,
  getImportErrorReport,
  getImportFields,
  getImportTemplate,
  saveImportMapping,
  validateImport,
  IMPORT_KIND_LABELS,
  type ImportJob,
  type ImportKind,
} from "@/api/services/imports";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";

const RESULT_LINKS: Record<ImportKind, { href: string; label: string }> = {
  students: { href: routes.portal.students, label: "Open the students directory" },
  staff: { href: routes.portal.staff, label: "Open the staff directory" },
  fees: { href: routes.portal.feesVouchers, label: "Open vouchers" },
};

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = ["Upload", "Map fields", "Validate", "Commit"] as const;

function stepIndex(job: ImportJob | null): number {
  if (!job) return 0;
  if (job.status === "uploaded") return 1;
  if (job.status === "mapped") return 2;
  return 3; // validated / committed
}

/**
 * Import wizard (Phase 7): upload → map → validate → explicit commit.
 * The file and all validation live behind the API seam; the browser
 * never logs row contents and nothing is created before "Confirm &
 * Import".
 */
export function ImportWizard({ kind }: { kind: ImportKind }) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [showOnlyProblems, setShowOnlyProblems] = useState(true);
  const [confirmCommit, setConfirmCommit] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const fieldsQuery = useQuery({
    queryKey: queryKeys.imports.fields(orgId, kind),
    queryFn: () => getImportFields(orgId, kind),
    enabled: Boolean(orgId),
  });

  const fail = (error: unknown) => {
    const info = normalizeApiError(error);
    toast({ title: info.friendlyTitle, description: info.friendlyDescription, variant: "error" });
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const isCsv = /\.csv$/i.test(file.name);
      const text = isCsv ? await file.text() : "";
      return createImport(orgId, kind, file.name, text);
    },
    onSuccess: (created) => {
      setJob(created);
      setMapping(created.mapping);
      toast({
        title: `${created.fileName} uploaded — ${created.totalRows} data row(s)`,
        variant: "success",
      });
    },
    onError: fail,
  });

  const saveMapping = useMutation({
    mutationFn: () => saveImportMapping(orgId, job!.id, mapping),
    onSuccess: (updated) => setJob(updated),
    onError: fail,
  });

  const validate = useMutation({
    mutationFn: () => validateImport(orgId, job!.id),
    onSuccess: (updated) => {
      setJob(updated);
      toast({
        title: "Validation complete",
        description: `${updated.validation!.okCount} ok · ${updated.validation!.warningCount} warning(s) · ${updated.validation!.errorCount} error(s)`,
        variant: updated.validation!.errorCount ? "warning" : "success",
      });
    },
    onError: fail,
  });

  const commit = useMutation({
    mutationFn: () => commitImport(orgId, job!.id),
    onSuccess: async (updated) => {
      setJob(updated);
      setConfirmCommit(false);
      toast({
        title: `Imported ${updated.result!.imported} record(s)`,
        description: `${updated.result!.skipped} skipped · ${updated.result!.failed} failed`,
        variant: "success",
      });
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      setConfirmCommit(false);
      fail(error);
    },
  });

  const discard = useMutation({
    mutationFn: () => discardImport(orgId, job!.id),
    onSuccess: () => {
      setJob(null);
      setMapping({});
      setConfirmDiscard(false);
      toast({ title: "Import discarded", variant: "success" });
    },
    onError: fail,
  });

  const downloadTemplate = async () => {
    try {
      downloadText(`fluxeaze-${kind}-template.csv`, await getImportTemplate(orgId, kind));
    } catch (error) {
      fail(error);
    }
  };

  const downloadReport = async () => {
    if (!job) return;
    try {
      downloadText(`import-errors-${job.id}.csv`, await getImportErrorReport(orgId, job.id));
    } catch (error) {
      fail(error);
    }
  };

  const fields = fieldsQuery.data ?? [];
  const activeStep = stepIndex(job);
  const validation = job?.validation ?? null;
  const visibleRows = validation
    ? validation.rows.filter((r) => !showOnlyProblems || r.status !== "ok").slice(0, 100)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Import steps" className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <Badge variant={i === activeStep ? "info" : i < activeStep ? "success" : "default"}>
              {i + 1}. {label}
            </Badge>
          </li>
        ))}
      </ol>

      {/* Step 1 — upload */}
      <Card>
        <CardHeader>
          <CardTitle>1 · Upload a CSV file</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {job ? (
            <p className="text-sm">
              <span className="font-medium">{job.fileName}</span> · {job.totalRows} data row(s) ·{" "}
              {job.headers.length} column(s)
            </p>
          ) : (
            <p className="text-sm text-muted">
              CSV up to 512 KB. Excel workbooks are parsed server-side in
              production — in this environment, save as CSV first. The file
              is sent to the backend import service; nothing is created yet.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              aria-label="Choose import file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()} isLoading={upload.isPending}>
              {job ? "Upload a different file" : "Choose file…"}
            </Button>
            <Button variant="subtle" onClick={() => void downloadTemplate()}>
              Download template CSV
            </Button>
            {job && job.status !== "committed" ? (
              <Button variant="subtle" onClick={() => setConfirmDiscard(true)}>
                Discard import
              </Button>
            ) : null}
          </div>
          {fieldsQuery.isError ? (
            <ErrorState error={fieldsQuery.error} onRetry={() => void fieldsQuery.refetch()} />
          ) : (
            <p className="text-sm text-muted">
              Required fields for {IMPORT_KIND_LABELS[kind].toLowerCase()}:{" "}
              {fields.filter((f) => f.required).map((f) => f.label).join(", ") || "…"}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Step 2 — mapping */}
      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>2 · Map columns to fields</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Table aria-label="Sample rows from your file">
              <TableHeader>
                <TableRow>
                  {job.headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.sampleRows.map((row, i) => (
                  <TableRow key={i}>
                    {job.headers.map((h, j) => (
                      <TableCell key={h}>{row[j] ?? ""}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ul className="flex flex-col gap-2">
              {job.headers.map((header) => (
                <li key={header} className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={`map-${header}`}
                    className="w-56 text-sm font-medium"
                  >
                    “{header}” →
                  </label>
                  <Select
                    id={`map-${header}`}
                    className="w-72"
                    value={mapping[header] ?? ""}
                    disabled={job.status === "committed"}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [header]: e.target.value }))
                    }
                  >
                    <option value="">(ignore this column)</option>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " (required)" : ""}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
            {job.status !== "committed" ? (
              <div>
                <Button onClick={() => saveMapping.mutate()} isLoading={saveMapping.isPending}>
                  Save mapping
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* Step 3 — validation */}
      {job && (job.status === "mapped" || validation) ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>3 · Validate &amp; preview</CardTitle>
            {job.status !== "committed" ? (
              <Button onClick={() => validate.mutate()} isLoading={validate.isPending}>
                {validation ? "Re-run validation" : "Run validation"}
              </Button>
            ) : null}
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {validate.isPending ? (
              <div role="status" aria-label="Validating import">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : validation ? (
              <>
                <p className="flex flex-wrap gap-2 text-sm" aria-live="polite">
                  <Badge variant="success">OK · {validation.okCount}</Badge>
                  <Badge variant="warning">Warnings · {validation.warningCount}</Badge>
                  <Badge variant="error">Errors · {validation.errorCount}</Badge>
                  <span className="text-muted">of {validation.totalRows} row(s)</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showOnlyProblems}
                      onChange={(e) => setShowOnlyProblems(e.target.checked)}
                    />
                    Show only rows with warnings/errors
                  </label>
                  <Button variant="subtle" onClick={() => void downloadReport()}>
                    Download error report (CSV)
                  </Button>
                </div>
                {visibleRows.length === 0 ? (
                  <Alert variant="success" title="Every row passed validation">
                    No errors or warnings were reported by the backend.
                  </Alert>
                ) : (
                  <Table aria-label="Validation results">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((r) => (
                        <TableRow key={r.line}>
                          <TableCell>{r.line}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                r.status === "error"
                                  ? "error"
                                  : r.status === "warning"
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{r.messages.join(" ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Validation checks required fields, formats and duplicates on
                the backend before anything is imported.
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Step 4 — commit */}
      {job && validation ? (
        <Card>
          <CardHeader>
            <CardTitle>4 · Confirm &amp; import</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {job.status === "committed" && job.result ? (
              <>
                <Alert variant="success" title="Import complete">
                  {job.result.imported} record(s) imported · {job.result.skipped} skipped ·{" "}
                  {job.result.failed} failed.
                </Alert>
                <p>
                  <Link
                    href={RESULT_LINKS[kind].href}
                    className="font-medium text-primary underline"
                  >
                    {RESULT_LINKS[kind].label} →
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Rows with errors ({validation.errorCount}) will be skipped;{" "}
                  {validation.okCount + validation.warningCount} row(s) will be
                  imported. This creates real records and can&apos;t be undone
                  from here.
                </p>
                <div>
                  <Button
                    onClick={() => setConfirmCommit(true)}
                    disabled={validation.okCount + validation.warningCount === 0}
                  >
                    Confirm &amp; Import
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmCommit}
        title={`Import ${validation ? validation.okCount + validation.warningCount : 0} ${IMPORT_KIND_LABELS[kind].toLowerCase()} record(s)?`}
        description="Records will be created in this organization. Rows with validation errors are skipped."
        confirmLabel="Confirm & Import"
        isConfirming={commit.isPending}
        onCancel={() => setConfirmCommit(false)}
        onConfirm={() => commit.mutate()}
      />
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this import?"
        description="The uploaded file and its mapping/validation will be deleted. Nothing has been imported yet."
        confirmLabel="Discard import"
        isConfirming={discard.isPending}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => discard.mutate()}
      />
    </div>
  );
}
