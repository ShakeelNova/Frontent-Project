import { z } from "zod";

/**
 * Shared field schemas (client mirrors — backend re-validates authoritatively).
 * Email uses a pragmatic format regex instead of Zod's strict default, which
 * rejects reserved domains (example.com) and other deliverable-in-practice
 * addresses; existence/deliverability is the backend's job to verify.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .regex(EMAIL_PATTERN, "Enter a valid email address.");

/** New-password policy (frontend baseline; backend may enforce more). */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "That password is too long.");

export const signInPasswordSchema = z
  .string()
  .min(1, "Enter your password.");
