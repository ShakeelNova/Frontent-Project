/**
 * DEV/TEST-ONLY device fixtures (Phase 6). CR-008.
 *
 * HONESTY: statuses here simulate what a REAL backend would report from
 * its device registry/connector. The K50 units below are deliberately
 * NOT verified (pending/not-configured) because no verified K50
 * integration exists yet — the one "verified" device is a QR station
 * whose heartbeat the (mock) backend has seen. Registering a device
 * ALWAYS starts at not_configured; only a backend verification flow
 * (not built) could ever change that.
 */

import { getMockMembership } from "@/api/mock/mock-portal";
import { mockRequireVisibleBranch } from "@/api/mock/mock-school";
import type {
  Device,
  RegisterDeviceInput,
  UpdateDeviceInput,
} from "@/api/services/devices";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

function makeDevices(): Record<string, Device[]> {
  const now = Date.now();
  return {
    "org-sunrise": [
      {
        id: "dev-sun-qr1",
        name: "Main gate QR station",
        type: "qr_station",
        branchId: "br-sunrise-main",
        branchName: "Main campus",
        status: "verified",
        lastHeartbeatUtc: new Date(now - 4 * 60_000).toISOString(),
        mode: "both",
      },
      {
        id: "dev-sun-k50",
        name: "Reception biometric (K50)",
        type: "biometric_k50",
        branchId: "br-sunrise-main",
        branchName: "Main campus",
        status: "pending_verification",
        lastHeartbeatUtc: null,
        mode: "staff",
      },
    ],
    "org-northgate": [
      {
        id: "dev-nor-k50",
        name: "City branch biometric (K50)",
        type: "biometric_k50",
        branchId: "br-northgate-city",
        branchName: "City branch",
        status: "not_configured",
        lastHeartbeatUtc: null,
        mode: "both",
      },
    ],
    "org-riverdale": [
      {
        id: "dev-riv-tab",
        name: "Gulberg front-desk tablet",
        type: "tablet",
        branchId: "br-riverdale-gulberg",
        branchName: "Gulberg branch",
        status: "not_configured",
        lastHeartbeatUtc: null,
        mode: "student",
      },
    ],
    "org-fresh": [],
  };
}

let devices = makeDevices();
let seq = 100;

export function __resetMockDevices(): void {
  devices = makeDevices();
  seq = 100;
}

function listOf(orgId: string): Device[] {
  getMockMembership(orgId);
  const list = devices[orgId];
  if (!list) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return list;
}

function requireDeviceManager(orgId: string): void {
  const m = getMockMembership(orgId);
  if (!["owner", "general_manager", "branch_manager"].includes(m.role)) {
    mockError(403, "FORBIDDEN", "Your role can't manage devices.");
  }
}

export const mockDevicesApi = {
  async listDevices(organizationId: string): Promise<Device[]> {
    await delay();
    return structuredClone(listOf(organizationId));
  },

  async registerDevice(
    organizationId: string,
    input: RegisterDeviceInput,
  ): Promise<Device> {
    await delay();
    requireDeviceManager(organizationId);
    mockRequireVisibleBranch(organizationId, input.branchId);
    const branchName =
      getMockMembership(organizationId).branches.find((b) => b.id === input.branchId)
        ?.name ?? input.branchId;
    const device: Device = {
      id: `dev-new-${++seq}`,
      name: input.name.trim(),
      type: input.type,
      branchId: input.branchId,
      branchName,
      // A device is NEVER born verified.
      status: "not_configured",
      lastHeartbeatUtc: null,
      mode: "both",
    };
    listOf(organizationId).push(device);
    return structuredClone(device);
  },

  async updateDevice(
    organizationId: string,
    deviceId: string,
    input: UpdateDeviceInput,
  ): Promise<Device> {
    await delay();
    requireDeviceManager(organizationId);
    const device = listOf(organizationId).find((d) => d.id === deviceId);
    if (!device) mockError(404, "DEVICE_NOT_FOUND", "Device not found.");
    if (input.branchId) {
      mockRequireVisibleBranch(organizationId, input.branchId);
      device.branchId = input.branchId;
      device.branchName =
        getMockMembership(organizationId).branches.find((b) => b.id === input.branchId)
          ?.name ?? input.branchId;
    }
    if (input.mode) device.mode = input.mode;
    return structuredClone(device);
  },

  async removeDevice(organizationId: string, deviceId: string): Promise<void> {
    await delay();
    requireDeviceManager(organizationId);
    const list = listOf(organizationId);
    if (!list.some((d) => d.id === deviceId)) {
      mockError(404, "DEVICE_NOT_FOUND", "Device not found.");
    }
    devices[organizationId] = list.filter((d) => d.id !== deviceId);
  },
};


/* Persistence seam */
export function __serialize(): unknown {
  return { devices, seq };
}

export function __restore(snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const value = snapshot as { devices?: unknown; seq?: unknown };
  if (Array.isArray(value.devices)) devices = value.devices as unknown as typeof devices;
  if (typeof value.seq === "number") seq = value.seq;
}
