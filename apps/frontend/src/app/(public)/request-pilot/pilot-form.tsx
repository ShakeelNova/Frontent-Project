"use client";

import { routes } from "@/lib/routes";

import { extractFieldErrors, normalizeApiError } from "@/api/errors";
import {
  submitPilotRequest,
  type PilotRequestInput,
} from "@/api/services/pilot";
import { MockHint } from "@/components/layout/mock-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { applyApiFieldErrors } from "@/lib/forms";
import { emailSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const pilotSchema = z.object({
  organizationName: z.string().trim().min(2, "Enter your organization's name."),
  contactName: z.string().trim().min(2, "Enter the contact person's name."),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[+()\-.\s\d]{7,20}$/.test(v),
      "Enter a valid phone number, or leave it empty.",
    ),
  country: z.string().trim().min(2, "Enter your country."),
  timezone: z.string().trim().min(1, "Select your timezone."),
  institutionType: z.enum([
    "school",
    "college",
    "academy",
    "coaching",
    "technical",
    "other",
  ]),
  studentCountBand: z.string().min(1, "Select an approximate size."),
  message: z.string().trim().max(1000).optional(),
});

type PilotFormValues = z.infer<typeof pilotSchema>;

const STUDENT_BANDS = ["1–100", "101–500", "501–2,000", "2,001–10,000", "10,000+"];

function timezoneOptions(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "UTC"];
  }
}

// Computed once (~400 entries) — not on every render.
const TIMEZONE_OPTIONS = timezoneOptions();

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function PilotForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PilotFormValues>({
    resolver: zodResolver(pilotSchema),
    defaultValues: {
      institutionType: "school",
      studentCountBand: STUDENT_BANDS[1],
      timezone: browserTimezone(),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PilotFormValues) =>
      submitPilotRequest(values as PilotRequestInput),
    onError: (error) => applyApiFieldErrors(error, setError),
  });

  if (mutation.isSuccess) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 py-8">
          <h2 className="text-h3">Request received — thank you</h2>
          <p className="text-muted">
            The Fluxeaze team will follow up by email with next steps for your
            pilot. We read every request; there&apos;s nothing else you need to do
            —.
          </p>
          {mutation.data.reference ? (
            <p className="text-sm text-muted">
              Reference: <code className="font-mono">{mutation.data.reference}</code>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={routes.home}
              className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Back to home
            </Link>
            <Link
              href={routes.auth.signIn}
              className="inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-raised"
            >
              Sign in
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;
  const hasFieldErrors =
    mutation.isError &&
    Object.keys(extractFieldErrors(mutation.error)).length > 0;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4"
      aria-describedby="pilot-form-note"
    >
      <MockHint>
        Any details submit successfully — except an email ending in{" "}
        <code className="font-mono">@example.invalid</code>, which returns a
        server field error.
      </MockHint>

      {errorInfo ? (
        <Alert
          variant="error"
          title={errorInfo.friendlyTitle}
          requestId={errorInfo.requestId}
        >
          {hasFieldErrors
            ? "Please correct the highlighted fields and submit again. Your entries below are preserved."
            : `${errorInfo.friendlyDescription} Your entries below are preserved — you can retry without re-typing.`}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Organization name" required error={errors.organizationName?.message}>
          <Input autoComplete="organization" placeholder="e.g. Sunrise Academy" {...register("organizationName")} />
        </FormField>
        <FormField label="Contact person" required error={errors.contactName?.message}>
          <Input autoComplete="name" placeholder="Full name" {...register("contactName")} />
        </FormField>
        <FormField label="Work email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="name@school.edu.pk" {...register("email")} />
        </FormField>
        <FormField label="Phone (optional)" error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" placeholder="+92 300 1234567" {...register("phone")} />
        </FormField>
        <FormField label="Country" required error={errors.country?.message}>
          <Input autoComplete="country-name" placeholder="e.g. Pakistan" {...register("country")} />
        </FormField>
        <FormField label="Timezone" required error={errors.timezone?.message}>
          <Select {...register("timezone")}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Institution type" required error={errors.institutionType?.message}>
          <Select {...register("institutionType")}>
            <option value="school">School</option>
            <option value="college">College</option>
            <option value="academy">Academy</option>
            <option value="coaching">Coaching centre</option>
            <option value="technical">Technical / vocational institute</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
        <FormField label="Approximate students" required error={errors.studentCountBand?.message}>
          <Select {...register("studentCountBand")}>
            {STUDENT_BANDS.map((band) => (
              <option key={band} value={band}>
                {band} students
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Anything we should know? (optional)" error={errors.message?.message}>
        <Textarea placeholder="Branches, current tools, timelines…" {...register("message")} />
      </FormField>

      <p id="pilot-form-note" className="text-sm text-muted">
        We use these details only to respond to your pilot request.
      </p>

      <div>
        <Button type="submit" size="lg" isLoading={mutation.isPending}>
          Request a pilot
        </Button>
      </div>
    </form>
  );
}
