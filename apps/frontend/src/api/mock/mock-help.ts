/**
 * DEV/TEST-ONLY help articles (Phase 7). A real deployment serves these
 * from the backend/config so docs links stay behind auth and can change
 * without a frontend release. docUrl/videoUrl are null in the dev mock —
 * we never fabricate external help-center URLs.
 */

import { getMockSessionUser } from "@/api/mock/mock-api";
import type { HelpArticle } from "@/api/services/help";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

const ARTICLES: Record<string, Omit<HelpArticle, "featureId" | "docUrl" | "videoUrl">> = {
  dashboard: {
    title: "Reading your dashboard",
    summary:
      "The dashboard summarizes the date range you pick at the top. Every number comes from the backend — drill into a branch or metric to see the underlying records.",
    bullets: [
      "Capacity warnings appear at 80% and 90%; at 100% only NEW enrollments pause — existing records are never blocked.",
      "Branch managers see only their authorized branches.",
    ],
  },
  students: {
    title: "Managing students",
    summary:
      "Search, filter and page through the directory, then open a student for guardians, enrollments, transfers and status changes.",
    bullets: [
      "Filters live in the URL — copy the link to share the exact view.",
      "Bulk-adding students? Use Imports → Students with a CSV file.",
    ],
  },
  attendance: {
    title: "Taking attendance",
    summary:
      "Mark a class manually or start a QR session. Late and missing flags on staff attendance are decided by the backend from punches — they are never guessed here.",
    bullets: [
      "QR sessions expire after 2 hours; duplicate scans are ignored safely.",
      "Times are stored in UTC and shown in your organization timezone.",
    ],
  },
  fees: {
    title: "Fees, vouchers & receipts",
    summary:
      "Create a fee structure, generate vouchers for a period, then record payments against each voucher. Amounts always use your organization's configured currency.",
    bullets: [
      "Payments recorded here are MANUAL entries (cash/bank/cheque you received offline) — receipts say so, and no payment gateway is involved.",
      "A payment can't exceed the voucher balance; settled vouchers are closed.",
    ],
  },
  imports: {
    title: "Importing data safely",
    summary:
      "Upload a CSV, map its columns to Fluxeaze fields, review the backend's validation report, and only then commit. Nothing is created before you confirm.",
    bullets: [
      "Download the template CSV to see the expected columns.",
      "Rows with errors are skipped at commit; warnings import but deserve a look.",
      "You can discard an import at any step before committing.",
    ],
  },
  staff: {
    title: "Staff, roles & approvals",
    summary:
      "Invite staff by email, approve new joiners, and manage roles and branch assignments from each person's profile.",
    bullets: [
      "Only Owners and General Managers can change roles.",
      "The last Owner's role can't be removed — assign another Owner first.",
    ],
  },
  devices: {
    title: "Devices & verification",
    summary:
      "A device is only “Verified” when the backend has verified it. K50 biometric units show “Pending verification” until a connector confirms them — attendance keeps working via manual and QR flows meanwhile.",
    bullets: ["New registrations always start as “Not configured”."],
  },
  settings: {
    title: "Organization settings",
    summary:
      "Profile, branches, timezone/currency, academic preferences, roles and security. Sensitive changes ask for confirmation and are authorized by the backend.",
    bullets: ["Disabling a branch doesn't delete its history."],
  },
};

export const mockHelpApi = {
  async getHelpArticle(featureId: string): Promise<HelpArticle | null> {
    await delay();
    if (!getMockSessionUser()) mockError(401, "SESSION_EXPIRED", "No mock session.");
    const article = ARTICLES[featureId];
    if (!article) return null;
    return { featureId, ...structuredClone(article), docUrl: null, videoUrl: null };
  },
};
