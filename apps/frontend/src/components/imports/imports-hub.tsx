"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import {
  listImports,
  IMPORT_KIND_LABELS,
  IMPORT_STATUS_LABELS,
  type ImportKind,
} from "@/api/services/imports";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { HelpButton } from "@/components/help/help-button";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrgPreferences } from "@/api/services/setup";
import { formatDateTimeInZone } from "@/lib/datetime";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const KIND_CARDS: { kind: ImportKind; blurb: string }[] = [
  {
    kind: "students",
    blurb: "Bulk-create student records from a spreadsheet (name, DOB, branch…).",
  },
  {
    kind: "staff",
    blurb: "Invite many staff at once — each row becomes an invitation with a role.",
  },
  {
    kind: "fees",
    blurb: "Create fee vouchers per student code, period and amount.",
  },
];

export function ImportsHub() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const query = useQuery({
    queryKey: queryKeys.imports.jobs(orgId),
    queryFn: () => listImports(orgId),
    enabled: Boolean(orgId),
  });
  const preferencesQuery = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });
  const timezone = preferencesQuery.data?.timezone ?? "UTC";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Imports</h1>
          <p className="mt-1 text-muted">
            Upload → map → validate → commit. Nothing is created until you
            confirm, and every row is checked by the backend first.
          </p>
        </div>
        <HelpButton featureId="imports" featureLabel="Imports" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {KIND_CARDS.map((c) => (
          <Card key={c.kind}>
            <CardHeader>
              <CardTitle>{IMPORT_KIND_LABELS[c.kind]}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <p className="text-sm text-muted">{c.blurb}</p>
              <p>
                <Link
                  href={routes.portal.importKind(c.kind)}
                  className="font-medium text-primary underline"
                >
                  Start {IMPORT_KIND_LABELS[c.kind].toLowerCase()} import →
                </Link>
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <section aria-labelledby="import-history-heading" className="mt-8">
        <h2 id="import-history-heading" className="text-h4">
          Recent imports
        </h2>
        <div className="mt-4">
          {query.isPending ? (
            <div role="status" aria-label="Loading import history" className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.data.length === 0 ? (
            <EmptyState
              title="No imports yet"
              description="Your import jobs (including discarded ones) will be listed here."
            />
          ) : (
            <Table aria-label="Import history">
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.fileName}</TableCell>
                    <TableCell>{IMPORT_KIND_LABELS[j.kind]}</TableCell>
                    <TableCell>{j.totalRows}</TableCell>
                    <TableCell>
                      <Badge variant={j.status === "committed" ? "success" : j.status === "discarded" ? "default" : "info"}>
                        {IMPORT_STATUS_LABELS[j.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {j.result
                        ? `${j.result.imported} imported · ${j.result.skipped} skipped · ${j.result.failed} failed`
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDateTimeInZone(j.createdAtUtc, timezone)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
