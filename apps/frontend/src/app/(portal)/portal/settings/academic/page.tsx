"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import { getOrgPreferences, updateOrgPreferences } from "@/api/services/setup";
import { ErrorState } from "@/components/feedback/error-state";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  gradingScheme: z.enum(["percentage", "letter"]),
  lateThresholdMinutes: z
    .number()
    .int("Use whole minutes.")
    .min(0, "Can't be negative.")
    .max(120, "Keep it under 2 hours."),
});
type Values = z.infer<typeof schema>;

/**
 * Academic preferences (Phase 7). These are configuration values the
 * BACKEND applies (grading display; late-flag threshold) — changing them
 * here never recomputes anything in the browser.
 */
export default function AcademicPreferencesPage() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });

  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    values: query.data
      ? {
          gradingScheme: query.data.gradingScheme,
          lateThresholdMinutes: query.data.lateThresholdMinutes,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      updateOrgPreferences(orgId, {
        // Preserve timezone/currency — this page edits academic prefs only.
        timezone: query.data!.timezone,
        currency: query.data!.currency,
        ...values,
      }),
    onSuccess: async () => {
      toast({ title: "Academic preferences saved", variant: "success" });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organization.preferences(orgId),
      });
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  return (
    <section aria-labelledby="academic-prefs-heading">
      <h2 id="academic-prefs-heading" className="text-h4">
        Academic preferences
      </h2>
      <p className="mt-1 text-sm text-muted">
        How results are presented and when the backend flags a late arrival.
        Academic years and class structure live under Academic structure.
      </p>
      <div className="mt-5 max-w-xl">
        {query.isPending ? (
          <div role="status" aria-label="Loading preferences" className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
          >
            {errorInfo ? (
              <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
                {errorInfo.friendlyDescription}
              </Alert>
            ) : null}
            <FormField
              label="Grading scheme"
              error={formState.errors.gradingScheme?.message}
              description="How published results are labeled for students and guardians."
            >
              <Select {...register("gradingScheme")}>
                <option value="percentage">Percentage</option>
                <option value="letter">Letter grades (A/B/C…)</option>
              </Select>
            </FormField>
            <FormField
              label="Late threshold (minutes)"
              error={formState.errors.lateThresholdMinutes?.message}
              description="Arrivals this many minutes after the start are flagged Late — by the backend, from punches."
            >
              <Input
                type="number"
                min={0}
                max={120}
                {...register("lateThresholdMinutes", { valueAsNumber: true })}
              />
            </FormField>
            <div>
              <Button type="submit" isLoading={mutation.isPending}>
                Save preferences
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
