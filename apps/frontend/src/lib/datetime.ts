/**
 * Timezone-aware display helpers (Phase 5).
 *
 * Rule: the API is the authority for instants (UTC); the frontend only
 * formats them in the organization's configured timezone for display.
 * Statuses like "current academic year" are NEVER recomputed here — they
 * come from the API. Plain dates (yyyy-mm-dd) are displayed as-is (a date
 * has no timezone).
 */

/** Formats an ISO datetime string in the given IANA timezone. */
export function formatDateTimeInZone(
  isoDateTime: string,
  timeZone: string,
): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Converts a UTC wall-clock time ("HH:mm", as used by weekly timetable
 * entries) into the org timezone's wall-clock time for display, e.g.
 * "03:00" UTC → "08:00" in Asia/Karachi. Uses a fixed reference date —
 * weekly recurring slots only care about the time-of-day offset.
 */
export function formatUtcTimeInZone(hhmmUtc: string, timeZone: string): string {
  const [hPart, mPart] = hhmmUtc.split(":");
  const hours = Number(hPart);
  const minutes = Number(mPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return hhmmUtc;
  // Reference Monday; only the offset matters for a recurring weekly slot.
  const ref = new Date(Date.UTC(2026, 0, 5, hours, minutes));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ref);
  const hh = parts.find((p) => p.type === "hour")?.value ?? String(hours);
  const mm = parts.find((p) => p.type === "minute")?.value ?? String(minutes);
  return `${hh}:${mm}`;
}

/**
 * Inverse of formatUtcTimeInZone: converts an org-local wall-clock time
 * ("HH:mm" as typed by a user in the org timezone) to the UTC wall-clock
 * time the API stores. Uses the same fixed reference date; good for
 * weekly recurring slots (offset is effectively constant across a term
 * for non-DST zones; backend remains the source of truth).
 */
export function zonedTimeToUtc(hhmmLocal: string, timeZone: string): string {
  const [hPart, mPart] = hhmmLocal.split(":");
  const hours = Number(hPart);
  const minutes = Number(mPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return hhmmLocal;
  const REF = { y: 2026, m: 0, d: 5 };
  const guessUtc = Date.UTC(REF.y, REF.m, REF.d, hours, minutes);
  const zoned = formatUtcTimeInZone(
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    timeZone,
  );
  const [zh, zm] = zoned.split(":").map(Number);
  let offsetMinutes = (zh ?? 0) * 60 + (zm ?? 0) - (hours * 60 + minutes);
  // Normalize day-wrap into the valid UTC-offset range (-12h…+14h).
  if (offsetMinutes < -720) offsetMinutes += 1440;
  if (offsetMinutes > 840) offsetMinutes -= 1440;
  const utc = new Date(guessUtc - offsetMinutes * 60_000);
  return `${String(utc.getUTCHours()).padStart(2, "0")}:${String(utc.getUTCMinutes()).padStart(2, "0")}`;
}

/** Human-friendly display of a plain ISO date (no timezone shifting). */
export function formatPlainDate(isoDate: string): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
