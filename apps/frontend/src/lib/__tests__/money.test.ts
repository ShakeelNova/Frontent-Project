import { formatMoney, minorUnitDivisor } from "../money";
import { describe, expect, it } from "vitest";

describe("money formatting (API minor units + currency)", () => {
  it("converts minor units using the currency's own exponent", () => {
    expect(minorUnitDivisor("USD")).toBe(100);
    expect(minorUnitDivisor("JPY")).toBe(1);
  });

  it("formats USD from minor units", () => {
    expect(formatMoney(1900, "USD")).toBe("$19.00");
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });

  it("does not assume a single currency (PKR has no minor unit in ISO/Intl)", () => {
    // PKR's exponent is 0 — the API sends whole rupees for PKR ledgers.
    expect(minorUnitDivisor("PKR")).toBe(1);
    const formatted = formatMoney(150050, "PKR");
    expect(formatted).toContain("150,050");
    expect(formatted).not.toContain("$");
  });

  it("handles zero-decimal currencies", () => {
    expect(formatMoney(1500, "JPY")).toContain("1,500");
    expect(formatMoney(1500, "JPY")).not.toContain("15.00");
  });
});
