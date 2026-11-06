/**
 * Frontend-only persistence snapshot.
 *
 * The app has no backend by design. All structured demo data lives in the
 * mock modules; this aggregator captures/restores that state so the browser
 * can act as the database (IndexedDB) and the user can export/import a JSON
 * backup to move data between computers.
 */
import { __restore as restoreAdmin, __serialize as serializeAdmin } from "./mock-admin";
import { __restore as restoreSession, __serialize as serializeSession } from "./mock-api";
import { __restore as restoreAttendance, __serialize as serializeAttendance } from "./mock-attendance";
import { __restore as restoreDevices, __serialize as serializeDevices } from "./mock-devices";
import { __restore as restoreFees, __serialize as serializeFees } from "./mock-fees";
import { __restore as restoreImports, __serialize as serializeImports } from "./mock-imports";
import { __restore as restorePortal, __serialize as serializePortal } from "./mock-portal";
import { __restore as restoreSchool, __serialize as serializeSchool } from "./mock-school";
import { __restore as restoreSettings, __serialize as serializeSettings } from "./mock-settings";
import { __restore as restoreStaff, __serialize as serializeStaff } from "./mock-staff";
import {
  __restore as restoreSubscriptions,
  __serialize as serializeSubscriptions,
} from "./mock-subscription";

export const SNAPSHOT_VERSION = 1 as const;

export interface MockSnapshotData {
  session: unknown;
  admin: unknown;
  attendance: unknown;
  devices: unknown;
  fees: unknown;
  imports: unknown;
  portal: unknown;
  school: unknown;
  settings: unknown;
  staff: unknown;
  subscriptions: unknown;
}

export interface MockSnapshot {
  version: typeof SNAPSHOT_VERSION;
  capturedAt: string;
  data: MockSnapshotData;
}

export function captureMockState(): MockSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    capturedAt: new Date().toISOString(),
    data: {
      session: serializeSession(),
      admin: serializeAdmin(),
      attendance: serializeAttendance(),
      devices: serializeDevices(),
      fees: serializeFees(),
      imports: serializeImports(),
      portal: serializePortal(),
      school: serializeSchool(),
      settings: serializeSettings(),
      staff: serializeStaff(),
      subscriptions: serializeSubscriptions(),
    },
  };
}

export function restoreMockState(snapshot: MockSnapshot): void {
  restoreSession(snapshot.data.session);
  restoreAdmin(snapshot.data.admin);
  restoreAttendance(snapshot.data.attendance);
  restoreDevices(snapshot.data.devices);
  restoreFees(snapshot.data.fees);
  restoreImports(snapshot.data.imports);
  restorePortal(snapshot.data.portal);
  restoreSchool(snapshot.data.school);
  restoreSettings(snapshot.data.settings);
  restoreStaff(snapshot.data.staff);
  restoreSubscriptions(snapshot.data.subscriptions);
}

/** Defensive validation for imported/legacy snapshots. */
export function isMockSnapshot(value: unknown): value is MockSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { version?: unknown; capturedAt?: unknown; data?: unknown };
  return (
    candidate.version === SNAPSHOT_VERSION &&
    typeof candidate.capturedAt === "string" &&
    Boolean(candidate.data) &&
    typeof candidate.data === "object"
  );
}

/** Small helper for the readable text export. */
export function snapshotSummary(snapshot: MockSnapshot): string {
  const data = snapshot.data as unknown as Record<string, unknown>;
  const count = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return 0;
  };
  const school = data.school as { students?: unknown[]; classes?: unknown[] } | undefined;
  const staff = data.staff as { staff?: unknown[] } | undefined;
  const fees = data.fees as Record<string, { vouchers?: unknown[] }> | undefined;
  const voucherCount = fees
    ? Object.values(fees).reduce((sum, org) => sum + count(org?.vouchers), 0)
    : 0;
  return [
    "Fluxeaze — local data summary",
    `Captured: ${snapshot.capturedAt}`,
    `Schema version: ${snapshot.version}`,
    "",
    `Students: ${count(school?.students)}`,
    `Classes: ${count(school?.classes)}`,
    `Staff records: ${count(staff?.staff)}`,
    `Fee vouchers: ${voucherCount}`,
    `Organizations: ${count((data.portal as { orgs?: unknown[] } | undefined)?.orgs)}`,
    "",
    "This summary is generated from the browser's local snapshot. It is not a",
    "server report. Use the JSON backup for a complete, restorable copy.",
  ].join("\n");
}
