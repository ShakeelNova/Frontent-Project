import { VoucherDetailView } from "@/components/fees/voucher-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Voucher" };

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  const { voucherId } = await params;
  return <VoucherDetailView voucherId={voucherId} />;
}
