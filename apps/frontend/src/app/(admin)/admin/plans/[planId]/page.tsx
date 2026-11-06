import { PlanVersions } from "@/components/admin/plan-versions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan versions — platform admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <PlanVersions planId={planId} />;
}
