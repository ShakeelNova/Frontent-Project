"use client";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  getOrgPreferences,
  updateOrgPreferences,
  type OrgPreferences,
} from "@/api/services/setup";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const preferencesSchema = z.object({
  timezone: z.string().min(1, "Select a timezone."),
  currency: z.string().length(3, "Select a currency."),
});

type PreferencesValues = z.infer<typeof preferencesSchema>;

// Common operating currencies; the API remains the source of truth and can
// widen this list without a frontend release once it publishes options.
const CURRENCIES = ["PKR", "USD", "AED", "SAR", "INR", "BDT", "GBP", "EUR"];

function allTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "UTC"];
  }
}
const TIMEZONES = allTimezones();

export function PreferencesForm() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organization.preferences(orgId),
    queryFn: () => getOrgPreferences(orgId),
    enabled: Boolean(orgId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreferencesValues>({ resolver: zodResolver(preferencesSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: PreferencesValues) =>
      updateOrgPreferences(orgId, values as OrgPreferences),
    onSuccess: async () => {
      toast({ title: "Preferences saved", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.preferences(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.setupStatus(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root }),
      ]);
    },
  });

  if (query.isPending) return <PageLoading label="Loading preferences…" className="min-h-40 py-8" />;
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
      <FormField
        label="Timezone"
        required
        description="Attendance punches are stored in UTC and displayed in this timezone."
        error={errors.timezone?.message}
      >
        <Select {...register("timezone")}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label="Fee ledger currency"
        required
        description="Your organization's vouchers and receipts use this currency (Fluxeaze subscriptions stay USD)."
        error={errors.currency?.message}
      >
        <Select {...register("currency")}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormField>
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Save preferences
        </Button>
      </div>
    </form>
  );
}
