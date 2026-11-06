/**
 * Money formatting — global rule: amounts come from the API as minor units
 * with an explicit currency. Never assume a currency (subscription catalogue
 * is USD-based; org fee ledgers use the org's configured currency), and never
 * label internal credits as money (credits are formatted as plain units by
 * callers, not through here).
 */

/** Number of minor units per major unit for a currency (e.g. USD→100, JPY→1). */
export function minorUnitDivisor(currency: string): number {
  try {
    const fractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    return 10 ** (fractionDigits ?? 2);
  } catch {
    return 100;
  }
}

/**
 * Formats an API amount given in minor units.
 * formatMoney(2500, "USD") → "$25.00". Zero-decimal currencies (PKR, JPY, …)
 * have no minor unit, so 2500 → "PKR 2,500" — the divisor always follows
 * the currency's own exponent, matching however the API denominates it.
 */
/**
 * Parses a user-typed major-unit amount ("1250.50") into integer minor
 * units for the given currency. Returns null for invalid/negative input.
 * The API remains the authority — it re-validates every amount.
 */
export function parseMajorToMinor(input: string, currency: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * minorUnitDivisor(currency));
}

/** Minor units → editable major-unit string for form prefill. */
export function minorToMajorInput(amountMinor: number, currency: string): string {
  const divisor = minorUnitDivisor(currency);
  const major = amountMinor / divisor;
  return divisor === 1 ? String(Math.round(major)) : major.toFixed(2);
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = "en-US",
): string {
  const major = amountMinor / minorUnitDivisor(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(major);
  } catch {
    // Unknown/invalid currency code — never guess a symbol.
    return `${major.toFixed(2)} ${currency}`;
  }
}
