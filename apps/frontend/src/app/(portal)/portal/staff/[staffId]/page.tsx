import { StaffDetailView } from "@/components/staff/staff-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff details" };

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  return <StaffDetailView staffId={staffId} />;
}
