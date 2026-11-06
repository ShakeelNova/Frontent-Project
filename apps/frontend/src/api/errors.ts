/**
 * API error translation — turns unknown thrown/returned error values into a
 * stable, user-facing shape for ErrorState/toasts/forms.
 *
 * ⚠️ CONTRACT STATUS: the canonical OpenAPI contract has NOT yet published
 * its error envelope (see BACKEND_INTEGRATION_REPORT.md). This module
 * therefore extracts status / code / message / requestId DEFENSIVELY from
 * common key spellings and maps only standard HTTP semantics to friendly
 * copy. When the contract lands, align the extraction keys to the documented
 * envelope and register real stable error codes in ERROR_CODE_COPY — do not
 * scatter ad-hoc parsing through feature code.
 */

export interface ApiErrorInfo {
  /** HTTP status when known (e.g. 403). */
  status?: number;
  /** Stable backend error code when provided (passthrough, never invented). */
  code?: string;
  /** Raw backend/debug message (for logs; show friendly copy to users). */
  message: string;
  friendlyTitle: string;
  friendlyDescription: string;
  /** Backend request ID — ALWAYS preserved for support/debug when present. */
  requestId?: string;
  isNetworkError: boolean;
  isUnauthorized: boolean;
  isForbidden: boolean;
  isValidationError: boolean;
}

/**
 * Friendly copy for stable backend error codes (extend from the contract).
 * The codes below are PROVISIONAL (Phase 3 dev-mock assumptions, logged in
 * BACKEND_INTEGRATION_REPORT.md) — reconcile names when the canonical
 * contract publishes its stable code registry.
 */
export const ERROR_CODE_COPY: Record<string, { title: string; description: string }> = {
  CONTRACT_NOT_PUBLISHED: {
    title: "This isn't available yet",
    description:
      "Fluxeaze is in early access and this feature opens soon. Your information hasn't been submitted.",
  },
  INVALID_CREDENTIALS: {
    title: "Email or password is incorrect",
    description: "Check your details and try again. If you forgot your password, you can reset it.",
  },
  ACCOUNT_LOCKED: {
    title: "This account is temporarily locked",
    description: "Too many unsuccessful attempts. Please wait a while or contact your administrator.",
  },
  EMAIL_NOT_VERIFIED: {
    title: "Please verify your email first",
    description: "We sent a verification link to your email address. Verify it, then sign in.",
  },
  TOKEN_EXPIRED: {
    title: "This link has expired",
    description: "For your security, links work for a limited time. Please request a new one.",
  },
  TOKEN_INVALID: {
    title: "This link is no longer valid",
    description: "It may have already been used or replaced by a newer link.",
  },
  EMAIL_ALREADY_REGISTERED: {
    title: "An account with this email already exists",
    description: "Try signing in instead, or reset your password if you've forgotten it.",
  },
  // Phase 5 (students & academics — provisional, CR-007):
  STUDENT_CAPACITY_FULL: {
    title: "Student capacity is full",
    description:
      "Cannot create a new active enrollment because your capacity is full. Contact your administrator or upgrade your plan. Existing students and records are unaffected.",
  },
  ALREADY_ENROLLED: {
    title: "Already enrolled",
    description: "This student is already enrolled in this program/class.",
  },
  STUDENT_NOT_FOUND: {
    title: "Student not found",
    description: "This student may have been removed, or the link is incorrect.",
  },
  PROGRAM_IN_USE: {
    title: "Program is in use",
    description: "This program still has classes or enrollments, so it can't be deleted yet.",
  },
  CLASS_IN_USE: {
    title: "Class is in use",
    description: "This class still has active enrollments, so it can't be deleted yet.",
  },
  SUBJECT_IN_USE: {
    title: "Subject is in use",
    description: "This subject is still assigned to a class, so it can't be deleted yet.",
  },
  ACADEMIC_YEAR_IN_USE: {
    title: "Academic year is in use",
    description: "Classes still reference this academic year, so it can't be deleted yet.",
  },
  // Phase 6 (staff, attendance, devices — provisional, CR-008):
  STAFF_NOT_FOUND: {
    title: "Staff member not found",
    description: "This staff record may have been removed, or the link is incorrect.",
  },
  INVITE_ALREADY_EXISTS: {
    title: "Already invited or on staff",
    description: "Someone with this email is already invited or an active staff member.",
  },
  ROLE_CHANGE_FORBIDDEN: {
    title: "Role change not allowed",
    description: "You are not allowed to change this user's role.",
  },
  LAST_OWNER: {
    title: "Can't remove the last owner",
    description: "An organization must always have at least one owner. Assign another owner first.",
  },
  ALREADY_CHECKED_IN: {
    title: "Already checked in",
    description: "This student has already checked in for this session — duplicate scan ignored.",
  },
  QR_SESSION_EXPIRED: {
    title: "QR session expired",
    description: "This check-in session has ended. Start a new session to continue.",
  },
  DEVICE_NOT_FOUND: {
    title: "Device not found",
    description: "This device may have been removed, or the link is incorrect.",
  },
  // Phase 7 — fees
  VOUCHER_NOT_FOUND: {
    title: "Voucher not found",
    description: "This voucher may have been removed, or the link is incorrect.",
  },
  FEE_STRUCTURE_NOT_FOUND: {
    title: "Fee structure not found",
    description: "This fee structure may have been removed, or the link is incorrect.",
  },
  PAYMENT_EXCEEDS_BALANCE: {
    title: "Payment is more than the balance",
    description: "Enter an amount up to the outstanding balance shown on the voucher.",
  },
  VOUCHER_ALREADY_SETTLED: {
    title: "Voucher already settled",
    description: "This voucher has no outstanding balance, so no payment can be recorded against it.",
  },
  // Phase 7 — imports
  IMPORT_JOB_NOT_FOUND: {
    title: "Import not found",
    description: "This import may have been discarded, or the link is incorrect.",
  },
  IMPORT_FILE_UNSUPPORTED: {
    title: "File type not supported here",
    description: "Upload a CSV file. If you have an Excel workbook, save it as CSV first.",
  },
  IMPORT_FILE_TOO_LARGE: {
    title: "File is too large",
    description: "Split the file into smaller batches and try again.",
  },
  IMPORT_MAPPING_INCOMPLETE: {
    title: "Mapping is incomplete",
    description: "Map every required field to a column in your file before validating.",
  },
  IMPORT_NOT_READY: {
    title: "Import isn't ready to commit",
    description: "Run validation first — only validated imports can be committed.",
  },
  // Phase 7 — student portal / settings
  LINKED_STUDENT_FORBIDDEN: {
    title: "Not your linked student",
    description: "You can only view information for students linked to your account.",
  },
  BRANCH_NOT_FOUND: {
    title: "Branch not found",
    description: "This branch may have been removed, or the link is incorrect.",
  },
  CURRENT_PASSWORD_INVALID: {
    title: "Current password is incorrect",
    description: "Double-check your current password and try again.",
  },
  ROLE_LOCKED: {
    title: "This role can't be edited",
    description: "System roles like Owner are managed by the platform and can't be changed here.",
  },
  // Phase 8 — subscription & platform admin
  BILLING_FORBIDDEN: {
    title: "Billing is restricted",
    description: "Only organization owners and managers with billing access can view subscription details.",
  },
  PLATFORM_ADMIN_FORBIDDEN: {
    title: "Platform admins only",
    description: "This internal area is restricted to Fluxeaze platform administrators.",
  },
  PLAN_NOT_FOUND: {
    title: "Plan not found",
    description: "This plan may have been removed, or the link is incorrect.",
  },
  PLAN_VERSION_NOT_FOUND: {
    title: "Plan version not found",
    description: "This plan version may have been removed, or the link is incorrect.",
  },
  PLAN_VERSION_NOT_DRAFT: {
    title: "Only drafts can be edited",
    description: "Preview, approved, published and retired versions are immutable. Clone this version to make changes.",
  },
  PLAN_VERSION_STATE_CONFLICT: {
    title: "That change isn't allowed yet",
    description: "Plan versions move draft → preview → approved → published. Check the current status and try again.",
  },
  ADDON_NOT_FOUND: {
    title: "Add-on not found",
    description: "This add-on may have been removed, or the link is incorrect.",
  },
  QUOTE_NOT_FOUND: {
    title: "Quote not found",
    description: "This quote may have been removed, or the link is incorrect.",
  },
  QUOTE_STATE_CONFLICT: {
    title: "That quote action isn't available",
    description: "Quotes move draft → sent → accepted/rejected, then convert to a subscription. Check the current status.",
  },
  QUOTE_RULE_NOT_FOUND: {
    title: "Quote rule not found",
    description: "This quote rule may have been removed, or the link is incorrect.",
  },
};

const STATUS_COPY: Record<number, { title: string; description: string }> = {
  400: {
    title: "That request couldn't be processed",
    description: "Please check the information you entered and try again.",
  },
  401: {
    title: "Your session has expired",
    description: "Please sign in again to continue.",
  },
  403: {
    title: "You don't have permission for this",
    description:
      "Your role or branch access doesn't allow this action. Contact your administrator if you think this is a mistake.",
  },
  404: {
    title: "We couldn't find that",
    description: "It may have been moved or deleted. Check the link and try again.",
  },
  409: {
    title: "This conflicts with existing data",
    description:
      "Something similar may already exist, or the record changed while you were working. Review and try again.",
  },
  422: {
    title: "Please review the highlighted fields",
    description: "Some information needs correction before it can be saved.",
  },
  429: {
    title: "Too many requests",
    description: "Please wait a moment and try again.",
  },
  500: {
    title: "Something went wrong on our side",
    description: "Please try again. If it keeps happening, contact support with the request ID below.",
  },
  502: {
    title: "The server is temporarily unavailable",
    description: "Please try again in a few moments.",
  },
  503: {
    title: "The server is temporarily unavailable",
    description: "Please try again in a few moments.",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(
  record: Record<string, unknown> | null,
  keys: string[],
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

function firstNumber(
  record: Record<string, unknown> | null,
  keys: string[],
): number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

/**
 * Normalizes any error value (fetch failure, openapi-fetch error body,
 * Error instance, plain object) into ApiErrorInfo. Never throws.
 */
export function normalizeApiError(error: unknown): ApiErrorInfo {
  const record = asRecord(error);
  // Support one level of envelope nesting ({ error: {...} }) defensively.
  const nested = asRecord(record?.error);
  const sources = [nested, record].filter(
    (s): s is Record<string, unknown> => s !== null,
  );

  const pickString = (keys: string[]) => {
    for (const source of sources) {
      const value = firstString(source, keys);
      if (value) return value;
    }
    return undefined;
  };
  const pickNumber = (keys: string[]) => {
    for (const source of sources) {
      const value = firstNumber(source, keys);
      if (value !== undefined) return value;
    }
    return undefined;
  };

  const status = pickNumber(["status", "statusCode"]);
  const code = pickString(["code", "errorCode"]);
  const requestId = pickString(["requestId", "request_id", "traceId"]);
  const rawMessage =
    pickString(["message", "detail", "title"]) ??
    (error instanceof Error ? error.message : undefined) ??
    (typeof error === "string" ? error : undefined);

  const isNetworkError =
    status === undefined &&
    (error instanceof TypeError ||
      /failed to fetch|network|load failed/i.test(rawMessage ?? ""));

  const byCode = code ? ERROR_CODE_COPY[code] : undefined;
  const byStatus = status !== undefined ? STATUS_COPY[status] : undefined;

  const friendly = byCode ??
    byStatus ??
    (isNetworkError
      ? {
          title: "Can't reach the server",
          description:
            "Check your connection and try again. Your work hasn't been submitted yet.",
        }
      : {
          title: "Something went wrong",
          description:
            "Please try again. If it keeps happening, contact support with the request ID below.",
        });

  return {
    status,
    code,
    message: rawMessage ?? friendly.title,
    friendlyTitle: friendly.title,
    friendlyDescription: friendly.description,
    requestId,
    isNetworkError,
    isUnauthorized: status === 401,
    isForbidden: status === 403,
    isValidationError: status === 400 || status === 422,
  };
}

/** Convenience for toasts/one-liners: "Title — description". */
export function getFriendlyErrorMessage(error: unknown): string {
  const info = normalizeApiError(error);
  return `${info.friendlyTitle} — ${info.friendlyDescription}`;
}

/**
 * Extracts field-level validation errors (field → message) for form
 * `setError` wiring. Defensive about envelope spelling (`fieldErrors`
 * object, or `errors: [{field, message}]`) until the contract documents
 * the validation format. Returns {} when none are present.
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const record = asRecord(error);
  const nested = asRecord(record?.error);
  const out: Record<string, string> = {};

  for (const source of [nested, record]) {
    if (!source) continue;
    const fieldErrors = asRecord(source.fieldErrors);
    if (fieldErrors) {
      for (const [field, value] of Object.entries(fieldErrors)) {
        if (typeof value === "string" && value.trim() !== "") out[field] = value;
        else if (Array.isArray(value) && typeof value[0] === "string") out[field] = value[0];
      }
    }
    if (Array.isArray(source.errors)) {
      for (const item of source.errors) {
        const entry = asRecord(item);
        const field = entry ? firstString(entry, ["field", "path", "param"]) : undefined;
        const message = entry ? firstString(entry, ["message", "detail"]) : undefined;
        if (field && message) out[field] = message;
      }
    }
  }
  return out;
}
