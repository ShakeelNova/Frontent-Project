"use client";

import { routes } from "@/lib/routes";

import { queryKeys } from "@/api/query-keys";

import { normalizeApiError } from "@/api/errors";
import {
  getVoucher,
  PAYMENT_MODE_LABELS,
  recordPayment,
  type FeePayment,
  type PaymentMode,
  type VoucherDetail,
} from "@/api/services/fees";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoading } from "@/components/feedback/page-loading";
import { statusBadge } from "@/components/fees/vouchers-panel";
import { useTenant } from "@/components/tenant/tenant-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyApiFieldErrors } from "@/lib/forms";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function VoucherDetailView({ voucherId }: { voucherId: string }) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id ?? "";
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);

  const query = useQuery({
    queryKey: queryKeys.fees.voucher(orgId, voucherId),
    queryFn: () => getVoucher(orgId, voucherId),
    enabled: Boolean(orgId && voucherId),
  });

  if (query.isPending) return <PageLoading label="Loading voucher…" />;
  if (query.isError) {
    const info = normalizeApiError(query.error);
    if (info.status === 404) {
      return (
        <EmptyState
          title="Voucher not found"
          description="This voucher may have been removed, or the link is incorrect."
          action={
            <Link href={routes.portal.feesVouchers} className="font-medium text-primary underline">
              Back to vouchers
            </Link>
          }
        />
      );
    }
    if (info.status === 403) {
      return (
        <EmptyState
          title="You don't have access to this voucher"
          description="It belongs to a branch you aren't authorized for. The backend hasn't shared its details with your account."
          action={
            <Link href={routes.portal.feesVouchers} className="font-medium text-primary underline">
              Back to vouchers
            </Link>
          }
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const v = query.data;
  const currency = v.currency;
  const gross = v.components.reduce((s, c) => s + c.amountMinor, 0);

  return (
    <div className="flex flex-col gap-5">
      <p>
        <Link href={routes.portal.feesVouchers} className="text-sm font-medium text-primary underline">
          ← Back to vouchers
        </Link>
      </p>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {v.studentName} · <span className="font-mono">{v.voucherNumber}</span>
            </CardTitle>
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono">{v.studentCode}</span> · {v.className ?? "—"} ·{" "}
              {v.branchName} · {v.periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(v.status)}
            {v.balanceMinor > 0 ? (
              <Button onClick={() => setPayOpen(true)}>Record payment</Button>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Issued</dt>
              <dd>{v.issueDate}</dd>
            </div>
            <div>
              <dt className="text-muted">Due date</dt>
              <dd>{v.dueDate}</dd>
            </div>
            <div>
              <dt className="text-muted">Paid so far</dt>
              <dd>{formatMoney(v.paidMinor, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted">Balance</dt>
              <dd className="font-semibold">{formatMoney(v.balanceMinor, currency)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col gap-1.5 text-sm">
            {v.components.map((c) => (
              <li key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span>{formatMoney(c.amountMinor, currency)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-1.5">
              <span className="text-muted">Subtotal</span>
              <span>{formatMoney(gross, currency)}</span>
            </li>
            {v.discounts.map((d) => (
              <li key={d.label} className="flex justify-between text-success-foreground">
                <span>Discount — {d.label}</span>
                <span>−{formatMoney(d.amountMinor, currency)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>Net payable</span>
              <span>{formatMoney(v.amountMinor, currency)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">Paid</span>
              <span>{formatMoney(v.paidMinor, currency)}</span>
            </li>
            <li className="flex justify-between font-semibold">
              <span>Balance</span>
              <span>{formatMoney(v.balanceMinor, currency)}</span>
            </li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardBody>
          {v.payments.length === 0 ? (
            <p className="text-sm text-muted">
              No payments recorded yet. Use “Record payment” when money is
              received offline (cash/bank/cheque).
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {v.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium">
                      {formatMoney(p.amountMinor, p.currency)} · {PAYMENT_MODE_LABELS[p.mode]}
                    </p>
                    <p className="text-xs text-muted">
                      {p.date} · {p.sourceLabel}
                      {p.reference ? ` · Ref ${p.reference}` : ""} · recorded by{" "}
                      {p.recordedByName}
                    </p>
                  </div>
                  <Button
                    variant="subtle"
                    onClick={() => setReceipt(p)}
                    aria-label={`View receipt ${p.receiptNumber}`}
                  >
                    Receipt {p.receiptNumber}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {payOpen ? (
        <RecordPaymentDialog
          orgId={orgId}
          voucher={v}
          onClose={() => setPayOpen(false)}
          onRecorded={(payment) => setReceipt(payment)}
        />
      ) : null}

      {receipt ? (
        <ReceiptDialog voucher={v} payment={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </div>
  );
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const paymentSchema = z.object({
  date: z.string().min(1, "Pick a date."),
  amount: z.string().trim().min(1, "Enter an amount."),
  mode: z.enum(["cash", "bank_transfer", "cheque", "other"]),
  reference: z.string().trim().max(60).optional(),
});
type PaymentValues = z.infer<typeof paymentSchema>;

function RecordPaymentDialog({
  orgId,
  voucher,
  onClose,
  onRecorded,
}: {
  orgId: string;
  voucher: VoucherDetail;
  onClose: () => void;
  onRecorded: (payment: FeePayment) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Financial-action rule: a payment is only recorded after an explicit
  // review + confirm step inside this dialog — never on first submit.
  const [review, setReview] = useState<PaymentValues | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: todayLocal(), amount: "", mode: "cash", reference: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: PaymentValues) => {
      const amountMinor = parseMajorToMinor(values.amount, voucher.currency);
      if (amountMinor === null || amountMinor <= 0) {
        throw {
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Validation failed.",
          fieldErrors: { amount: "Enter a valid amount greater than zero." },
        };
      }
      return recordPayment(orgId, voucher.id, {
        date: values.date,
        amountMinor,
        mode: values.mode as PaymentMode,
        reference: values.reference,
      });
    },
    onSuccess: async (data) => {
      toast({ title: "Payment recorded", variant: "success" });
      queryClient.setQueryData(queryKeys.fees.voucher(orgId, voucher.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.fees.root });
      onClose();
      const latest = data.payments[data.payments.length - 1];
      if (latest) onRecorded(latest);
    },
    onError: (error) => {
      setReview(null); // back to the form so field errors are visible
      applyApiFieldErrors(error, setError);
    },
  });
  const errorInfo = mutation.isError ? normalizeApiError(mutation.error) : null;

  const toReview = handleSubmit((values) => {
    const amountMinor = parseMajorToMinor(values.amount, voucher.currency);
    if (amountMinor === null || amountMinor <= 0) {
      setError("amount", { message: "Enter a valid amount greater than zero." });
      return;
    }
    setReview(values);
  });
  const reviewAmountMinor = review ? parseMajorToMinor(review.amount, voucher.currency) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Record a manual payment"
      description={`Balance due: ${formatMoney(voucher.balanceMinor, voucher.currency)}. This records money already received offline — no card or bank transaction happens here.`}
      footer={
        review ? (
          <>
            <Button variant="subtle" onClick={() => setReview(null)} disabled={mutation.isPending}>
              Back to edit
            </Button>
            <Button onClick={() => mutation.mutate(review)} isLoading={mutation.isPending}>
              Confirm payment
            </Button>
          </>
        ) : (
          <>
            <Button variant="subtle" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={toReview} disabled={mutation.isPending}>
              Review payment
            </Button>
          </>
        )
      }
    >
      {review ? (
        <div className="flex flex-col gap-3 text-sm">
          <Alert variant="warning" title="Please confirm before recording">
            Once recorded, this manual payment can&apos;t be edited here.
            Double-check the amount against the cash or bank record you
            received.
          </Alert>
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted">Student</dt>
            <dd className="font-medium">{voucher.studentName}</dd>
            <dt className="text-muted">Voucher</dt>
            <dd className="font-medium">{voucher.voucherNumber}</dd>
            <dt className="text-muted">Amount</dt>
            <dd className="font-medium">
              {reviewAmountMinor !== null
                ? formatMoney(reviewAmountMinor, voucher.currency)
                : review.amount}
            </dd>
            <dt className="text-muted">Mode</dt>
            <dd className="font-medium">
              {PAYMENT_MODE_LABELS[review.mode as PaymentMode] ?? review.mode}
            </dd>
            <dt className="text-muted">Date received</dt>
            <dd className="font-medium">{review.date}</dd>
            <dt className="text-muted">Reference</dt>
            <dd className="font-medium">{review.reference || "—"}</dd>
            <dt className="text-muted">Balance after</dt>
            <dd className="font-medium">
              {reviewAmountMinor !== null
                ? formatMoney(
                    Math.max(0, voucher.balanceMinor - reviewAmountMinor),
                    voucher.currency,
                  )
                : "—"}
            </dd>
          </dl>
        </div>
      ) : (
      <form noValidate onSubmit={toReview} className="flex flex-col gap-4">
        {errorInfo ? (
          <Alert variant="error" title={errorInfo.friendlyTitle} requestId={errorInfo.requestId}>
            {errorInfo.friendlyDescription}
          </Alert>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`Amount (${voucher.currency})`} required error={formState.errors.amount?.message}>
            <Input inputMode="decimal" placeholder="0.00" {...register("amount")} />
          </FormField>
          <FormField label="Date received" required error={formState.errors.date?.message}>
            <Input type="date" max={todayLocal()} {...register("date")} />
          </FormField>
          <FormField label="Payment mode" required error={formState.errors.mode?.message}>
            <Select {...register("mode")}>
              {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_MODE_LABELS[m]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Reference (optional)"
            error={formState.errors.reference?.message}
            description="Cheque №, bank txn ID, cash book entry…"
          >
            <Input {...register("reference")} />
          </FormField>
        </div>
      </form>
      )}
    </Dialog>
  );
}

function ReceiptDialog({
  voucher,
  payment,
  onClose,
}: {
  voucher: VoucherDetail;
  payment: FeePayment;
  onClose: () => void;
}) {
  const { currentOrganization } = useTenant();
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Receipt ${payment.receiptNumber}`}
      footer={
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <Alert variant="info" title="Manually recorded payment">
          This receipt confirms a payment your team recorded in Fluxeaze
          after receiving money offline. It is not a bank or payment-gateway
          confirmation.
        </Alert>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="text-muted">Organization</dt>
          <dd>{currentOrganization?.name}</dd>
          <dt className="text-muted">Student</dt>
          <dd>
            {voucher.studentName} (<span className="font-mono">{voucher.studentCode}</span>)
          </dd>
          <dt className="text-muted">Voucher</dt>
          <dd className="font-mono">
            {voucher.voucherNumber} · {voucher.periodLabel}
          </dd>
          <dt className="text-muted">Amount received</dt>
          <dd className="font-semibold">{formatMoney(payment.amountMinor, payment.currency)}</dd>
          <dt className="text-muted">Mode</dt>
          <dd>{PAYMENT_MODE_LABELS[payment.mode]}</dd>
          <dt className="text-muted">Date</dt>
          <dd>{payment.date}</dd>
          {payment.reference ? (
            <>
              <dt className="text-muted">Reference</dt>
              <dd>{payment.reference}</dd>
            </>
          ) : null}
          <dt className="text-muted">Recorded by</dt>
          <dd>{payment.recordedByName}</dd>
          <dt className="text-muted">Balance after payment</dt>
          <dd>{formatMoney(voucher.balanceMinor, voucher.currency)}</dd>
        </dl>
      </div>
    </Dialog>
  );
}
