"use client";

import { queryKeys } from "@/api/query-keys";

import { extractFieldErrors, normalizeApiError } from "@/api/errors";
import {
  getOrgProfile,
  updateOrgProfile,
  uploadOrganizationLogo,
  type OrgProfile,
} from "@/api/services/setup";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization name."),
  contactEmail: emailSchema,
  contactPhone: z.string().trim(),
  address: z.string().trim().max(240, "Keep the address under 240 characters."),
  logoUrl: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Enter a valid http(s) logo URL, or leave empty."),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.organization.profile(orgId),
    queryFn: () => getOrgProfile(orgId),
    enabled: Boolean(orgId),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  // Logo upload (backend file rules; stored URL comes from the API).
  const logoUrl = useWatch({ control, name: "logoUrl" }) ?? "";
  const [logoError, setLogoError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadOrganizationLogo(orgId, file),
    onSuccess: (data) => {
      setLogoError(null);
      setValue("logoUrl", data.logoUrl, { shouldDirty: true });
      toast({ title: "Logo uploaded", variant: "success" });
    },
    onError: (error) => {
      setLogoError(
        extractFieldErrors(error).logo ?? normalizeApiError(error).friendlyTitle,
      );
    },
  });
  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    logoMutation.mutate(file);
  };

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) =>
      updateOrgProfile(orgId, values as OrgProfile),
    onSuccess: async () => {
      toast({ title: "Profile saved", variant: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.profile(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organization.setupStatus(orgId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.organizationsRoot }),
      ]);
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  if (query.isPending) return <PageLoading label="Loading profile…" className="min-h-40 py-8" />;
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
      <FormField label="Organization name" required error={errors.name?.message}>
        <Input autoComplete="organization" {...register("name")} />
      </FormField>
      <FormField label="Contact email" required error={errors.contactEmail?.message}>
        <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("contactEmail")} />
      </FormField>
      <FormField label="Contact phone (optional)" error={errors.contactPhone?.message}>
        <Input type="tel" autoComplete="tel" {...register("contactPhone")} />
      </FormField>
      <FormField label="Address (optional)" error={errors.address?.message}>
        <Input
          autoComplete="street-address"
          placeholder="e.g. 12 Main Boulevard, Gulberg, Karachi"
          {...register("address")}
        />
      </FormField>
      <FormField
        label="Logo (optional)"
        description="PNG, JPG, WebP or SVG, up to 1 MB. Uploaded to the backend file service — the stored URL comes from the API."
        error={logoError ?? errors.logoUrl?.message}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {previewUrl || logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- API-hosted logo; preview is a local object URL
              <img
                src={previewUrl ?? logoUrl}
                alt="Organization logo"
                className="h-12 w-12 rounded-md border border-border bg-surface object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-caption text-muted"
              >
                No logo
              </span>
            )}
            <div className="flex flex-col gap-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                aria-label="Upload organization logo"
                disabled={logoMutation.isPending}
                onChange={(e) => onLogoFile(e.target.files?.[0])}
              />
              {logoMutation.isPending ? (
                <span className="text-caption text-muted">Uploading…</span>
              ) : logoUrl ? (
                <span className="text-caption text-muted">
                  On file: <span className="font-mono">{logoUrl.split("/").pop()}</span>
                </span>
              ) : null}
            </div>
            {logoUrl ? (
              <Button
                variant="subtle"
                onClick={() => {
                  setValue("logoUrl", "", { shouldDirty: true });
                  setPreviewUrl(null);
                }}
              >
                Remove logo
              </Button>
            ) : null}
          </div>
          <input type="hidden" {...register("logoUrl")} />
        </div>
      </FormField>
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
