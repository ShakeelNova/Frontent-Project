"use client";

import { queryKeys } from "@/api/query-keys";

import {
  listAuditEvents,
  type AuditEntityType,
} from "@/api/services/admin-catalog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeInZone } from "@/lib/datetime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  plan_version: "Plan version",
  addon: "Add-on",
  quote: "Quote",
  quote_rule: "Quote rule",
  subscription: "Subscription",
};

/** Filterable platform audit history (who changed what, when). */
export function AuditPanel() {
  const [entityType, setEntityType] = useState<AuditEntityType | "">("");
  const [actorQuery, setActorQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useQuery({
    queryKey: queryKeys.admin.audit(entityType, actorQuery, from, to),
    queryFn: () =>
      listAuditEvents({
        entityType: entityType || undefined,
        actorQuery: actorQuery.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        className="grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Audit filters"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Entity type
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value as AuditEntityType | "")}>
            <option value="">All types</option>
            {(Object.keys(ENTITY_LABELS) as AuditEntityType[]).map((t) => (
              <option key={t} value={t}>
                {ENTITY_LABELS[t]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Changed by
          <Input placeholder="Search actor…" value={actorQuery} onChange={(e) => setActorQuery(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          From
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          To
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </form>

      {query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          title="No audit events match"
          description="Try widening the date range or clearing the filters."
        />
      ) : (
        <>
          <p className="text-sm text-muted">{query.data.length} event(s) · times in UTC</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When (UTC)</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDateTimeInZone(e.occurredAtUtc, "UTC")}</TableCell>
                  <TableCell>{e.actorLabel}</TableCell>
                  <TableCell>
                    {e.entityLabel}{" "}
                    <Badge variant="default">{ENTITY_LABELS[e.entityType]}</Badge>
                  </TableCell>
                  <TableCell>{e.action}</TableCell>
                  <TableCell>{e.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
