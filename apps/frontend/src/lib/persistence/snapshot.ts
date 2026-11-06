/**
 * Snapshot persistence + backup/restore. All operations are local to the
 * browser. Nothing is uploaded; the user explicitly downloads a file.
 */
import {
  captureMockState,
  isMockSnapshot,
  restoreMockState,
  snapshotSummary,
  type MockSnapshot,
} from "@/api/mock/state";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "./db";

export async function hydrateFromStorage(): Promise<boolean> {
  const snapshot = await loadSnapshot();
  if (!snapshot || !isMockSnapshot(snapshot)) return false;
  restoreMockState(snapshot);
  return true;
}

export async function persistNow(): Promise<MockSnapshot> {
  const snapshot = captureMockState();
  await saveSnapshot(snapshot);
  return snapshot;
}

export function buildBackupJson(): string {
  return JSON.stringify(captureMockState(), null, 2);
}

export function buildBackupText(): string {
  return snapshotSummary(captureMockState());
}

export async function importBackupJson(raw: string): Promise<MockSnapshot> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON. Choose a Fluxeaze backup file.");
  }
  if (!isMockSnapshot(parsed)) {
    throw new Error("That file isn't a valid Fluxeaze backup (schema version mismatch).");
  }
  restoreMockState(parsed);
  await saveSnapshot(parsed);
  return parsed;
}

export async function resetLocalData(): Promise<void> {
  await clearSnapshot();
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupFilename(extension: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `fluxeaze-backup-${stamp}.${extension}`;
}
