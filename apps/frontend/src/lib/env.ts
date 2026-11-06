/**
 * Runtime environment validation.
 *
 * The frontend talks to the backend REST API exclusively through
 * `NEXT_PUBLIC_API_BASE_URL`. Production URLs are never hardcoded — this
 * helper is the single place that reads and validates the variable.
 */

const API_BASE_URL_ENV_VAR = "NEXT_PUBLIC_API_BASE_URL";

/**
 * Returns the validated backend API base URL (no trailing slash).
 *
 * @throws Error with an actionable message when the variable is missing,
 *   empty, relative, or not an http(s) URL.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      `${API_BASE_URL_ENV_VAR} is not set. Copy apps/frontend/.env.example ` +
        `to apps/frontend/.env.local (e.g. ${API_BASE_URL_ENV_VAR}=http://localhost:4000/api/v1) ` +
        `and restart the dev server.`,
    );
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(
      `${API_BASE_URL_ENV_VAR} must be a valid absolute URL, got ${JSON.stringify(raw)}. ` +
        `Example: http://localhost:4000/api/v1`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `${API_BASE_URL_ENV_VAR} must use http or https, got ${JSON.stringify(url.protocol)}. ` +
        `Example: http://localhost:4000/api/v1`,
    );
  }

  return url.toString().replace(/\/+$/, "");
}

/** Non-throwing variant for status/diagnostic UI. */
export function tryGetApiBaseUrl(): string | null {
  try {
    return getApiBaseUrl();
  } catch {
    return null;
  }
}
