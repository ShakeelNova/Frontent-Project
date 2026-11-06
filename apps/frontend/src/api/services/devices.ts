import { mockDevicesApi } from "@/api/mock/mock-devices";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Devices service seam (Phase 6). Assumed endpoints (CR-008):
 *   GET    /organizations/{orgId}/devices
 *   POST   /organizations/{orgId}/devices            (register)
 *   PATCH  /organizations/{orgId}/devices/{id}       (branch/mode mapping)
 *   DELETE /organizations/{orgId}/devices/{id}
 *
 * HONESTY RULE (K50/biometrics): the frontend renders the API's status
 * verbatim. "Verified" (green) appears ONLY when the backend reports
 * status=verified; a freshly registered device starts as not_configured.
 * Manual + QR attendance never depend on devices being configured.
 */

export type DeviceType = "qr_station" | "biometric_k50" | "tablet";
export type DeviceStatus =
  | "not_configured"
  | "pending_verification"
  | "verified"
  | "offline";

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  qr_station: "QR station",
  biometric_k50: "Biometric (K50)",
  tablet: "Tablet / kiosk",
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  not_configured: "Not configured",
  pending_verification: "Pending verification",
  verified: "Verified",
  offline: "Offline",
};

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  branchId: string | null;
  branchName: string | null;
  status: DeviceStatus;
  lastHeartbeatUtc: string | null;
  mode: "student" | "staff" | "both";
}

export interface RegisterDeviceInput {
  name: string;
  type: DeviceType;
  branchId: string;
}

export interface UpdateDeviceInput {
  branchId?: string;
  mode?: Device["mode"];
}

const FEATURE = "Devices";

export async function listDevices(organizationId: string): Promise<Device[]> {
  if (getApiTransport() === "mock") return mockDevicesApi.listDevices(organizationId);
  return contractUnavailable(FEATURE);
}
export async function registerDevice(
  organizationId: string,
  input: RegisterDeviceInput,
): Promise<Device> {
  if (getApiTransport() === "mock") return mockDevicesApi.registerDevice(organizationId, input);
  return contractUnavailable(FEATURE);
}
export async function updateDevice(
  organizationId: string,
  deviceId: string,
  input: UpdateDeviceInput,
): Promise<Device> {
  if (getApiTransport() === "mock") return mockDevicesApi.updateDevice(organizationId, deviceId, input);
  return contractUnavailable(FEATURE);
}
export async function removeDevice(organizationId: string, deviceId: string): Promise<void> {
  if (getApiTransport() === "mock") return mockDevicesApi.removeDevice(organizationId, deviceId);
  return contractUnavailable(FEATURE);
}
