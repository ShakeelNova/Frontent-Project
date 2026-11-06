# @fluxeaze/api-contract

Canonical OpenAPI contract for the Fluxeaze backend REST API.

- **Single source of truth:** `openapi.yaml` in this directory.
- The frontend must **never** modify this spec directly and must **never**
  invent endpoints or response shapes. Mismatches are raised as contract
  change requests (see `/BACKEND_INTEGRATION_REPORT.md`).
- Generate frontend types with `npm run api:types` (from repo root).
- CI verifies generated output is not stale with `npm run api:check`.
- The consumed version + SHA-256 are recorded in `/contracts/CONTRACT_VERSION.txt`.

> ⚠️ **Current status (Phase 1):** `openapi.yaml` is an explicitly-marked
> placeholder with **no endpoints**. It exists only to verify the generation
> pipeline. All API-dependent frontend work is **blocked** until the backend
> team publishes the canonical contract baseline and this file is replaced.
