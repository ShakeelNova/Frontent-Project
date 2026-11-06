import { mockApi } from "@/api/mock/mock-api";
import { contractUnavailable, getApiTransport } from "@/api/transport";

export type InstitutionType =
  | "school"
  | "college"
  | "academy"
  | "coaching"
  | "technical"
  | "other";

export interface PilotRequestInput {
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  country: string;
  timezone: string;
  institutionType: InstitutionType;
  /** Size band key, e.g. "1-100", "101-500", "501-2000", "2000+". */
  studentCountBand: string;
  message?: string;
}

export async function submitPilotRequest(
  input: PilotRequestInput,
): Promise<{ reference?: string }> {
  if (getApiTransport() === "mock") return mockApi.submitPilotRequest(input);
  // TODO(contract): apiClient().POST(<pilot/quote request path>, { body })
  return contractUnavailable("Pilot requests");
}
