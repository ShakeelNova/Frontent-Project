import { mockHelpApi } from "@/api/mock/mock-help";
import { contractUnavailable, getApiTransport } from "@/api/transport";

/**
 * Contextual help seam (Phase 7). Assumed endpoint (CR-009):
 *   GET /help/articles/{featureId}
 * The backend/config owns the feature→article mapping (docs/video links
 * stay behind auth). Unknown features return null — the UI shows a
 * minimal explanation rather than a broken link.
 */

export interface HelpArticle {
  featureId: string;
  title: string;
  summary: string;
  bullets: string[];
  docUrl: string | null;
  videoUrl: string | null;
}

export async function getHelpArticle(featureId: string): Promise<HelpArticle | null> {
  if (getApiTransport() === "mock") return mockHelpApi.getHelpArticle(featureId);
  return contractUnavailable("Help");
}
