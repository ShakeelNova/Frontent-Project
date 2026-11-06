import { PageHeader } from "@/components/ui/page-header";
import type { Metadata } from "next";
import { BackupRestorePanel } from "./backup-panel";

export const metadata: Metadata = { title: "Backup & restore" };

export default function BackupPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Backup & restore"
        description="Your workspace is stored in this browser. Download a backup, move it to another computer, and restore it whenever you need."
      />
      <BackupRestorePanel />
    </div>
  );
}
