/**
 * DEV/TEST-ONLY in-memory mock transport (NEXT_PUBLIC_API_TRANSPORT=mock).
 *
 * Deterministic scenarios for exercising Phase 3 flows before the canonical
 * contract/backend exist. NOT a backend: no persistence, no real sessions
 * (module memory only — nothing is written to web storage), and fixture
 * plans/prices below are test data, never product truth. Assumed endpoint
 * shapes are logged as change requests in BACKEND_INTEGRATION_REPORT.md.
 * Never enable this transport for a production deployment.
 *
 * Scenario triggers (also surfaced in the mock hint boxes):
 * - sign-in: owner@demo.fluxeaze.test → staff/owner ·
 *   guardian@demo.fluxeaze.test → guardian (student/parent area) ·
 *   admin@fluxeaze.test → platform admin (Phase 8; no tenant orgs) ·
 *   (any 8+ char password) · locked@fluxeaze.test → ACCOUNT_LOCKED ·
 *   unverified@fluxeaze.test → EMAIL_NOT_VERIFIED · else INVALID_CREDENTIALS
 * - reset/verify tokens: "expired-token" → TOKEN_EXPIRED · "invalid-token"
 *   → TOKEN_INVALID · anything else → success
 * - invite tokens: "pending-token" → pending approval · "ready-token" →
 *   ready · "expired-token" → expired · anything else → invalid
 * - pilot requests: email @demo-outage.test → 500 (server-error recovery
 *   scenario) · @example.invalid → 422 field error · else success
 */

import type {
  AuthUser,
  SignInInput,
  SignUpInput,
} from "@/api/services/auth";
import type { AcceptInviteInput, InviteDetails } from "@/api/services/invites";
import type { PilotRequestInput } from "@/api/services/pilot";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function mockError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}`, fieldErrors };
}

let sessionUser: AuthUser | null = null;

/** Test helper: clears the in-memory mock session between tests. */
export function __resetMockSession(): void {
  sessionUser = null;
}

/** Shared with mock-portal.ts so all mock services see one session. */
export function getMockSessionUser(): AuthUser | null {
  return sessionUser;
}

export const mockApi = {
  async getCurrentUser(): Promise<AuthUser | null> {
    await delay(50);
    return sessionUser;
  },

  async signIn(input: SignInInput): Promise<AuthUser> {
    await delay();
    const email = input.email.trim().toLowerCase();
    if (email === "locked@fluxeaze.test") {
      mockError(423, "ACCOUNT_LOCKED", "Account locked after repeated failures.");
    }
    if (email === "unverified@fluxeaze.test") {
      mockError(403, "EMAIL_NOT_VERIFIED", "Email address has not been verified.");
    }
    if (email === "admin@fluxeaze.test") {
      // Phase 8 scenario: Fluxeaze platform administrator. Holds NO tenant
      // memberships; only the (admin) area accepts this session (every
      // tenant endpoint 403s, mirroring the real backend).
      sessionUser = {
        id: "mock-user-admin",
        email,
        fullName: "Fluxeaze Platform Admin (mock)",
        kind: "staff",
        isPlatformAdmin: true,
      };
      return sessionUser;
    }
    if (email === "noorg@fluxeaze.test") {
      // Phase 4 scenario: authenticated user with zero organization access.
      sessionUser = {
        id: "mock-user-noorg",
        email,
        fullName: "New User — no org (mock)",
        kind: "staff",
        isPlatformAdmin: false,
      };
      return sessionUser;
    }
    if (email === "guardian@demo.fluxeaze.test") {
      // Phase 7 scenario: guardian linked to students at Sunrise Academy
      // (see mock-student-portal.ts). Student/parent area only.
      sessionUser = {
        id: "mock-user-guardian",
        email,
        fullName: ["Sadia", "Fatima"].join(" ") + " (guardian, mock)",
        kind: "guardian",
        isPlatformAdmin: false,
      };
      return sessionUser;
    }
    if (email !== "owner@demo.fluxeaze.test") {
      mockError(401, "INVALID_CREDENTIALS", "No mock account matches those credentials.");
    }
    sessionUser = {
      id: "mock-user-1",
      email,
      fullName: "Demo Owner (mock)",
      kind: "staff",
      isPlatformAdmin: false,
    };
    return sessionUser;
  },

  async signUp(input: SignUpInput): Promise<{ requiresEmailVerification: boolean }> {
    await delay();
    if (input.email.trim().toLowerCase() === "owner@demo.fluxeaze.test") {
      mockError(409, "EMAIL_ALREADY_REGISTERED", "Email already registered.", {
        email: "An account with this email already exists.",
      });
    }
    return { requiresEmailVerification: true };
  },

  async signOut(): Promise<void> {
    await delay(50);
    sessionUser = null;
  },

  async forgotPassword(): Promise<void> {
    await delay();
  },

  async resetPassword(token: string): Promise<void> {
    await delay();
    assertUsableToken(token);
  },

  async verifyEmail(token: string): Promise<void> {
    await delay();
    assertUsableToken(token);
  },

  async resendVerification(): Promise<void> {
    await delay();
  },

  async submitPilotRequest(
    input: PilotRequestInput,
  ): Promise<{ reference: string }> {
    await delay();
    if (input.email.trim().toLowerCase().endsWith("@demo-outage.test")) {
      mockError(500, "INTERNAL_ERROR", "Simulated server error (mock trigger).");
    }
    if (input.email.trim().toLowerCase().endsWith("@example.invalid")) {
      mockError(422, "VALIDATION_ERROR", "Validation failed.", {
        email: "This email domain can't receive mail. Use a work email.",
      });
    }
    return { reference: "PILOT-DEMO-001" };
  },

  async getInvite(token: string): Promise<InviteDetails> {
    await delay();
    if (token === "pending-token") {
      return {
        status: "pending_approval",
        organizationName: "Demo Academy (mock)",
        roleLabel: "Teacher",
        branchName: "Main campus",
        email: "invitee@fluxeaze.test",
      };
    }
    if (token === "ready-token") {
      return {
        status: "ready",
        organizationName: "Demo Academy (mock)",
        roleLabel: "Teacher",
        branchName: "Main campus",
        email: "invitee@fluxeaze.test",
      };
    }
    if (token === "expired-token") {
      mockError(410, "TOKEN_EXPIRED", "Invite token expired.");
    }
    mockError(404, "TOKEN_INVALID", "Invite token not found.");
  },

  async acceptInvite(
    token: string,
    input: AcceptInviteInput,
  ): Promise<void> {
    void token;
    void input;
    await delay();
  },
};

function assertUsableToken(token: string): void {
  if (token === "expired-token") {
    mockError(410, "TOKEN_EXPIRED", "Token expired.");
  }
  if (!token || token === "invalid-token") {
    mockError(400, "TOKEN_INVALID", "Token invalid.");
  }
}
