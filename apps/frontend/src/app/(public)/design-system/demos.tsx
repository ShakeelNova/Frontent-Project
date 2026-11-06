"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast, type ToastVariant } from "@/components/ui/toast";
import { useState, type FormEvent } from "react";

/** Interactive demo islands for the design-system showcase page. */

export function FormDemo() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address, e.g. name@school.edu.pk.");
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    // Demo only: simulates latency locally; no data leaves the browser.
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Demo form valid",
        description: "This is a design-system demo — nothing was submitted.",
        variant: "success",
      });
    }, 600);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <FormField
        label="Email address"
        description="Try submitting an invalid email to see field-level errors."
        error={error}
        required
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder="name@school.edu.pk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Validate demo form
        </Button>
      </div>
    </form>
  );
}

export function DialogDemo() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="subtle" onClick={() => setDialogOpen(true)}>
        Open dialog
      </Button>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Open confirm dialog
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Example dialog"
        description="Focus is trapped here. Try Tab, Shift+Tab, Escape, or clicking the backdrop."
        footer={
          <Button variant="primary" onClick={() => setDialogOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-sm text-muted">
          Dialogs are used for focused tasks and confirmations — never for
          whole feature flows.
        </p>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this demo record?"
        description="Confirmation pattern for destructive, financial and publishing actions. Nothing is actually deleted."
        confirmLabel="Yes, delete (demo)"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast({ title: "Demo confirmed", variant: "info" });
        }}
      />
    </div>
  );
}

export function ToastDemo() {
  const { toast } = useToast();
  const variants: ToastVariant[] = ["success", "error", "warning", "info"];
  return (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => (
        <Button
          key={variant}
          variant="subtle"
          onClick={() =>
            toast({
              title: `${variant[0]?.toUpperCase()}${variant.slice(1)} toast`,
              description: "Announced via a polite ARIA live region.",
              variant,
            })
          }
        >
          {variant} toast
        </Button>
      ))}
    </div>
  );
}

export function FeedbackDemo() {
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Alert variant="success" title="Alert — success">
          Inline form/page messages (role=status; errors use role=alert).
        </Alert>
        <Alert variant="error" title="Alert — error" requestId="demo-req-123">
          With a preserved backend request ID for support.
        </Alert>
      </div>
      <EmptyState
        title="No records yet"
        description="Empty states always explain the next step instead of showing a blank area."
        action={
          <Button
            variant="subtle"
            onClick={() => toast({ title: "Demo action", variant: "info" })}
          >
            Primary next step
          </Button>
        }
      />
      <ErrorState
        error={{ status: 503, requestId: "demo-req-123" }}
        onRetry={() => {
          setRetryCount((c) => c + 1);
          toast({ title: `Retry pressed (${retryCount + 1})`, variant: "info" });
        }}
      />
      <div aria-hidden="true" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <p className="pt-1 text-caption text-muted">Skeleton placeholders</p>
      </div>
      <div className="rounded-lg border border-border bg-surface">
        <PageLoading label="PageLoading demo…" className="min-h-40 py-8" />
      </div>
    </div>
  );
}
