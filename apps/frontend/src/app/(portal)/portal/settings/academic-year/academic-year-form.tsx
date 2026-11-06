"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  getAcademicYearBasics,
  updateAcademicYearBasics,
  type AcademicYearBasics,
} from "@/api/services/setup";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const academicYearSchema = z
  .object({
    label: z.string().trim().min(2, "Give the year a label, e.g. 2026–27."),
    startsOn: z.string().min(1, "Select a start date."),
    endsOn: z.string().min(1, "Select an end date."),
  })
  .refine((v) => v.startsOn < v.endsOn, {
    path: ["endsOn"],
    message: "End date must be after the start date.",
  });

type AcademicYearValues = z.infer<typeof academicYearSchema>;

export function AcademicYearForm() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organization.academicYear(orgId),
    queryFn: () => getAcademicYearBasics(orgId),
    enabled: Boolean(orgId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcademicYearValues>({ resolver: zodResolver(academicYearSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: AcademicYearValues) =>
      updateAcademicYearBasics(orgId, values as AcademicYearBasics),
    onSuccess: async () => {
      toast({ title: "Academic year saved", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.academicYear(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.setupStatus(orgId) }),
      ]);
    },
  });

  if (query.isPending) return <PageLoading label="Loading academic year…" className="min-h-40 py-8" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
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
      <FormField label="Year label" required error={errors.label?.message}>
        <Input placeholder="2026–27" {...register("label")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Starts on" required error={errors.startsOn?.message}>
          <Input type="date" {...register("startsOn")} />
        </FormField>
        <FormField label="Ends on" required error={errors.endsOn?.message}>
          <Input type="date" {...register("endsOn")} />
        </FormField>
      </div>
      <p className="text-sm text-muted">
        Terms, programs, classes and timetables build on this in the Academic
        structure phase.
      </p>
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Save academic year
        </Button>
      </div>
    </form>
  );
}
