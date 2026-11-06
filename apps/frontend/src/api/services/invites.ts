import { mockApi } from "@/api/mock/mock-api";
import { contractUnavailable, getApiTransport } from "@/api/transport";

export type InviteStatus = "ready" | "pending_approval";

export interface InviteDetails {
  status: InviteStatus;
  organizationName: string;
  roleLabel: string;
  branchName?: string;
  email: string;
}

export interface AcceptInviteInput {
  fullName: string;
  phone?: string;
  password: string;
}

/** Loads invite summary by token. Invalid/expired tokens THROW (TOKEN_*). */
export async function getInvite(token: string): Promise<InviteDetails> {
  if (getApiTransport() === "mock") return mockApi.getInvite(token);
  return contractUnavailable("Invitations");
}

export async function acceptInvite(
  token: string,
  input: AcceptInviteInput,
): Promise<void> {
  if (getApiTransport() === "mock") return mockApi.acceptInvite(token, input);
  return contractUnavailable("Invitations");
}
