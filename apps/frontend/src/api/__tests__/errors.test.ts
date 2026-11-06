import {
  extractFieldErrors,
  getFriendlyErrorMessage,
  normalizeApiError,
} from "../errors";
import { describe, expect, it } from "vitest";

describe("normalizeApiError", () => {
  it("maps 401/403/422 to friendly copy with correct flags", () => {
    const unauthorized = normalizeApiError({ status: 401 });
    expect(unauthorized.isUnauthorized).toBe(true);
    expect(unauthorized.friendlyTitle).toMatch(/session/i);

    const forbidden = normalizeApiError({ status: 403 });
    expect(forbidden.isForbidden).toBe(true);
    expect(forbidden.friendlyTitle).toMatch(/permission/i);

    const validation = normalizeApiError({ status: 422 });
    expect(validation.isValidationError).toBe(true);
  });

  it("preserves code + requestId from a nested error envelope", () => {
    const info = normalizeApiError({
      error: { status: 500, code: "INTERNAL", message: "boom", requestId: "req-9" },
    });
    expect(info.code).toBe("INTERNAL");
    expect(info.requestId).toBe("req-9");
    expect(info.message).toBe("boom");
  });

  it("classifies fetch TypeErrors as network errors", () => {
    const info = normalizeApiError(new TypeError("Failed to fetch"));
    expect(info.isNetworkError).toBe(true);
    expect(info.friendlyTitle).toMatch(/Can't reach the server/);
  });

  it("never throws on unknown values and provides fallback copy", () => {
    expect(normalizeApiError(undefined).friendlyTitle).toBeTruthy();
    expect(normalizeApiError(null).friendlyTitle).toBeTruthy();
    expect(getFriendlyErrorMessage({ status: 404 })).toContain("couldn't find that");
  });
});

describe("extractFieldErrors", () => {
  it("reads a fieldErrors object (string + array forms)", () => {
    expect(
      extractFieldErrors({
        fieldErrors: { email: "Taken", password: ["Too short"] },
      }),
    ).toEqual({ email: "Taken", password: "Too short" });
  });

  it("reads errors: [{field, message}] inside a nested envelope", () => {
    expect(
      extractFieldErrors({
        error: { errors: [{ field: "phone", message: "Invalid phone" }] },
      }),
    ).toEqual({ phone: "Invalid phone" });
  });

  it("returns {} when no field errors exist", () => {
    expect(extractFieldErrors({ status: 500 })).toEqual({});
    expect(extractFieldErrors(undefined)).toEqual({});
  });
});
