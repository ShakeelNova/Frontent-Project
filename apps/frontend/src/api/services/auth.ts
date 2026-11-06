import { mockApi } from "@/api/mock/mock-api";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Auth service seam. Session is the backend's HttpOnly cookie (via the
 * central `apiClient` once the contract lands) — this layer never sees,
 * stores, or logs tokens or plaintext passwords beyond handing form values
 * to the transport.
 */

/**
 * Who is signed in, straight from `/auth/me`. `staff` users use the org
 * portal; `guardian`/`student` users only ever see their linked students
 * in the student/parent area. The backend authorizes every call — this
 * kind is routing/UX context, never a security decision.
 */
export type UserKind = "staff" | "guardian" | "student";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  kind: UserKind;
  /**
   * Platform-level (Fluxeaze internal) administrator, straight from
   * `/auth/me`. Distinct from any organization role: platform admins use
   * the `(admin)` area only and hold no tenant memberships. Routing/UX
   * context only — every admin endpoint re-authorizes server-side.
   */
  isPlatformAdmin: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

/**
 * Current-session bootstrap (`/auth/me` equivalent).
 * Returns null when signed out. In today's pre-contract state the contract
 * transport also returns null (treated as signed out) instead of throwing
 * on every page render.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getApiTransport() === "mock") return mockApi.getCurrentUser();
  // TODO(contract): apiClient().GET("/auth/me") — 401 → null; else map user.
  return null;
}

export async function signIn(input: SignInInput): Promise<AuthUser> {
  if (getApiTransport() === "mock") return mockApi.signIn(input);
  // TODO(contract): apiClient().POST(sign-in path, { body: input })
  return contractUnavailable("Sign-in");
}

export async function signUp(
  input: SignUpInput,
): Promise<{ requiresEmailVerification: boolean }> {
  if (getApiTransport() === "mock") return mockApi.signUp(input);
  return contractUnavailable("Sign-up");
}

export async function signOut(): Promise<void> {
  if (getApiTransport() === "mock") return mockApi.signOut();
  return contractUnavailable("Sign-out");
}

export async function forgotPassword(input: { email: string }): Promise<void> {
  void input; // body sent by the contract adapter when the spec lands
  if (getApiTransport() === "mock") return mockApi.forgotPassword();
  return contractUnavailable("Password reset");
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  if (getApiTransport() === "mock") return mockApi.resetPassword(input.token);
  return contractUnavailable("Password reset");
}

export async function verifyEmail(input: { token: string }): Promise<void> {
  if (getApiTransport() === "mock") return mockApi.verifyEmail(input.token);
  return contractUnavailable("Email verification");
}

export async function resendVerification(input: {
  email: string;
}): Promise<void> {
  void input; // body sent by the contract adapter when the spec lands
  if (getApiTransport() === "mock") return mockApi.resendVerification();
  return contractUnavailable("Verification email");
}
