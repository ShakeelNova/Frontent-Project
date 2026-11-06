import { VersionEditor } from "@/components/admin/version-editor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan version — platform admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ planId: string; versionId: string }>;
}) {
  const { planId, versionId } = await params;
  return <VersionEditor planId={planId} versionId={versionId} />;
}
