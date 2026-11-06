"use client";

import { usePersistence } from "@/components/persistence/persistence-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

const INCLUDED = [
  "Students, guardians, enrollment history and transfers",
  "Staff, roles, branches and approvals",
  "Attendance records, QR sessions, corrections and leave",
  "Fee structures, vouchers, manual receipts and reports",
  "Settings, subscriptions, imports and the platform catalogue",
];

export function BackupRestorePanel() {
  const persistence = usePersistence();
  const { toast } = useToast();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleJson = () => {
    persistence.downloadJson();
    toast({
      title: "Backup downloaded",
      description: "Your JSON backup is in your downloads folder. Keep it somewhere safe.",
      variant: "success",
    });
  };

  const handleText = () => {
    persistence.downloadText();
    toast({
      title: "Summary downloaded",
      description: "A readable text summary has been saved to your downloads folder.",
      variant: "success",
    });
  };

  const handleRestore = async () => {
    if (!pendingFile) return;
    setBusy(true);
    try {
      await persistence.restoreFromFile(pendingFile);
      toast({
        title: "Backup restored",
        description: "Your data has been replaced. Reloading the workspace…",
        variant: "success",
      });
      setPendingFile(null);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      toast({
        title: "Could not restore that file",
        description: error instanceof Error ? error.message : "The backup file could not be read.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await persistence.resetData();
      toast({
        title: "Local data cleared",
        description: "Reloading with the seeded demo data…",
        variant: "success",
      });
      window.setTimeout(() => window.location.reload(), 700);
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-success">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Your data lives in this browser</CardTitle>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Fluxeaze stores your workspace locally with IndexedDB. Nothing is
                uploaded to a server. Download a backup to move your data to another
                computer, or restore a previous backup.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={persistence.hydrated ? "success" : "warning"} dot>
              {persistence.hydrated ? "Local storage ready" : "Preparing local storage…"}
            </Badge>
            {persistence.lastSavedAt ? (
              <Badge variant="neutral">
                Last saved {new Date(persistence.lastSavedAt).toLocaleTimeString()}
              </Badge>
            ) : null}
            <Badge variant="purple">No backend</Badge>
          </div>
          {persistence.error ? (
            <Alert variant="error" title="Local save failed">
              {persistence.error}
            </Alert>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Download a backup</CardTitle>
            <p className="mt-1 text-sm text-muted">Save a complete copy to your PC or USB drive.</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Button onClick={handleJson} className="justify-start">
              <Icon name="download" className="h-4 w-4" />
              Download JSON backup
            </Button>
            <Button variant="subtle" onClick={handleText} className="justify-start">
              <Icon name="download" className="h-4 w-4" />
              Download readable summary (.txt)
            </Button>
            <p className="text-caption leading-relaxed text-faint">
              The JSON file is the complete restorable backup. The text file is a
              human-readable summary for quick reference.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore from a backup</CardTitle>
            <p className="mt-1 text-sm text-muted">Import a Fluxeaze JSON backup on this or another computer.</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <FileUpload
              label="Choose a Fluxeaze backup (.json)"
              description="The file is validated before anything is replaced."
              accept=".json,application/json"
              fileName={pendingFile?.name ?? null}
              onFile={(file) => setPendingFile(file)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleRestore()} disabled={!pendingFile || busy} isLoading={busy}>
                <Icon name="upload" className="h-4 w-4" />
                Restore this backup
              </Button>
              <Button variant="subtle" onClick={() => void persistence.saveNow()} disabled={busy}>
                <Icon name="refresh" className="h-4 w-4" />
                Save now
              </Button>
            </div>
            <p className="text-caption leading-relaxed text-faint">
              Restoring replaces the current local data. You&apos;ll be asked to
              confirm before anything changes.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="border-error/20">
        <CardHeader>
          <CardTitle>Reset local data</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Clear this browser&apos;s snapshot and start again from the seeded demo data.
          </p>
        </CardHeader>
        <CardBody>
          <Button variant="destructive" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" className="h-4 w-4" />
            Reset local data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingFile)}
        title="Restore this backup?"
        description="Your current local data will be replaced by the contents of the selected file. This cannot be undone."
        confirmLabel="Restore backup"
        cancelLabel="Cancel"
        variant="primary"
        isConfirming={busy}
        onConfirm={() => void handleRestore()}
        onCancel={() => setPendingFile(null)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset all local data?"
        description="Every local change will be removed and the seeded demo data will be restored. Download a backup first if you want to keep your work."
        confirmLabel="Reset everything"
        cancelLabel="Cancel"
        variant="destructive"
        isConfirming={busy}
        onConfirm={() => void handleReset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
