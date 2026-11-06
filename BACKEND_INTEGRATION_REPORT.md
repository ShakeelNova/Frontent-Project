# Backend Integration Report — Fluxeaze Frontend

_Last updated: 2026-10-27 (Phase 8: subscription, platform admin, deferred integrations, final testing & docs — canonical contract still unpublished, see §1–§2, CR-001…CR-010 in §6, verification inventory in §14)_

## 1. Contract baseline

| Item | Value |
|---|---|
| Contract file | `packages/api-contract/openapi.yaml` |
| Contract version | `0.0.0-placeholder` |
| SHA-256 | `d6294db1e82df49b4062b67b12403f999e9fbeba8f92e73bd915dba41f1ba52f` |
| Record of truth | `contracts/CONTRACT_VERSION.txt` |
| Generated client | `apps/frontend/src/api/generated.ts` (via `openapi-typescript`; consumed through `openapi-fetch`) |
| Staleness gate | `npm run api:check` (checksum + regeneration diff) — verified passing, and verified to fail on hand-edited output |

> ⛔ **CANONICAL CONTRACT NOT YET PUBLISHED.** The checked-in spec is a
> deliberate placeholder declaring **no endpoints and no schemas**, created
> only to verify the generation pipeline without inventing API surface. The
> frontend (Phases 1–8 + full-spec audit) is complete against the typed
> service seam: `contract` transport degrades honestly (nothing fabricated),
> and the dev/test `mock` transport exercises every flow against the assumed
> shapes logged as CR-001…CR-010 (plus §15 addenda). **Live-backend
> verification is blocked** until the backend team publishes the canonical
> baseline at the path above. On publication the frontend will: replace the
> placeholder → `npm run api:types` → update `CONTRACT_VERSION.txt` → fix
> type errors → re-point the service adapters at the generated client → rerun
> the full test matrix (see §14 inventory).

## 2. Endpoints used by feature area

**No live endpoints yet** (canonical contract unpublished — see §1). Phase 3
introduces a **service seam** (`apps/frontend/src/api/services/{auth,plans,
pilot,invites}.ts`) over two transports (`apps/frontend/src/api/transport.ts`):

- **`contract` (default/production):** designed to call the generated client.
  Today every write rejects with `CONTRACT_NOT_PUBLISHED` and reads degrade
  honestly (pricing → spec'd empty state; `/auth/me` → signed out). When the
  contract publishes, implement adapters in these files only.
- **`mock` (dev/test ONLY, `NEXT_PUBLIC_API_TRANSPORT=mock`):** deterministic
  in-memory fixtures (`src/api/mock/mock-api.ts`) behind a visible banner.

**PROVISIONAL endpoint assumptions** the mock services are shaped around —
to be confirmed/replaced by the canonical contract (tracked as CR-001 in §6):

| Feature | Assumed endpoint(s) | Used by |
|---|---|---|
| Public plans | `GET /public/plans` (published only; minor units + currency + allowances) | `/pricing` |
| Pilot/quote | `POST /public/pilot-requests` | `/request-pilot` |
| Auth | `POST /auth/sign-up` · `POST /auth/sign-in` · `POST /auth/sign-out` · `GET /auth/me` | auth pages, `useAuth` |
| Password/email | `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/verify-email` · `POST /auth/resend-verification` | reset/verify flows |
| Invites | `GET /invites/{token}` · `POST /invites/{token}/accept` | `/invite/[token]` |
| Tenant scope (Phase 4) | `GET /auth/organizations` (name + caller's role) · `GET /organizations/{orgId}/branches` (backend-authorized branches only) | org chooser, `TenantProvider`, top-bar switchers |
| Dashboards (Phase 4) | `GET /organizations/{orgId}/dashboard?from&to` · `GET /organizations/{orgId}/branches/{branchId}/dashboard?from&to` (metrics in org currency minor units + per-branch rows + alerts + capacity) | `/portal`, `/portal/branch` |
| Setup (Phase 4) | `GET /organizations/{orgId}/setup` (+ profile/preferences/academic-year sub-resources, `POST …/branches`) | setup checklist, `/portal/settings/*` |
| Students (Phase 5) | `GET/POST /organizations/{orgId}/students` (paged `{items,total,page,pageSize}`, `search`/`branchId`/`status`/`programId`) · `GET/PATCH …/students/{id}` · `POST …/students/{id}/status` · `POST …/students/{id}/transfer` · `POST …/students/{id}/guardians`, `DELETE …/guardians/{gid}` · `POST …/students/{id}/enrollments`, `POST …/enrollments/{eid}/end` | `/portal/students`, `/portal/students/[studentId]` |
| Academics (Phase 5) | `GET/POST/PATCH/DELETE /organizations/{orgId}/{academic-years,programs,classes,subjects}` · `…/classes/{id}/subjects` (GET/POST/DELETE) · `…/classes/{id}/timetable` (GET/POST/DELETE; UTC wall-clock `HH:mm`) | `/portal/academics/*` |
| Staff (Phase 6) | `GET/POST /organizations/{orgId}/staff` (paged; `search`/`branchId`/`departmentId`/`designationId`/`status`) · `GET/PATCH …/staff/{id}` · `POST …/staff/{id}/approve|reject|activate|deactivate` · `POST/DELETE …/staff/{id}/roles[/{roleKey}]` · `POST/DELETE …/staff/{id}/branches[/{branchId}]` · `GET …/staff/catalogs/{departments,designations,roles}` | `/portal/staff`, `/portal/staff/[staffId]` |
| Attendance (Phase 6) | `GET /organizations/{orgId}/attendance/students?date&classId` · `POST …/attendance/students/mark` (batch) · `POST/GET …/attendance/qr-sessions[/{id}]` · `POST …/qr-sessions/{id}/check-in {token}` · `GET …/attendance/staff?date&branchId` · `GET/POST …/attendance/{correction,leave}-requests` + `POST …/{correction,leave}-requests/{id}/approve|reject` | `/portal/attendance/*` |
| Devices (Phase 6) | `GET/POST /organizations/{orgId}/devices` · `PATCH …/devices/{id}` (branch/mode) · `DELETE …/devices/{id}` — status + heartbeat are backend-owned; registration ⇒ `not_configured` | `/portal/devices` |
| Fees (Phase 7) | `GET/POST/PATCH /organizations/{orgId}/fee-structures[/{id}]` · `GET …/fee-vouchers` (paged; `status`/`branchId`/`classId`/`q`/`from`/`to`) · `GET …/fee-vouchers/{id}` · `POST …/fee-vouchers/generate` · `POST …/fee-vouchers/{id}/manual-payments` · `GET …/fee-vouchers/{id}/receipt` · `GET …/fees/report` — balances/statuses backend-owned; manual payments only (CR-009) | `/portal/fees/*` |
| Student portal (Phase 7) | `GET /me/students` · `GET /me/students/{id}/{home,attendance,timetable,fees,notices,results}` — linked students only; 403 otherwise; results may be absent (CR-009) | `/student/*` |
| Imports (Phase 7) | `GET/POST /organizations/{orgId}/imports` (kinds `students|staff|fees`; multipart upload) · `PUT …/imports/{id}/mapping` · `POST …/imports/{id}/validate|commit|discard` · `GET …/imports/{id}/error-report` (CR-009) | `/portal/imports/*` |
| Help (Phase 7) | `GET /help/articles/{featureId}` (authenticated; unknown → 404/empty, UI falls back) | help buttons |
| Settings (Phase 7) | `GET …/settings/permissions` · `PUT …/settings/roles/{roleKey}/permissions` · `GET …/branches/{id}` + `PATCH` (status toggle) · `POST /auth/change-password` · `GET /auth/sessions` · `DELETE /auth/sessions/{id}` · `POST /auth/sessions/revoke-others` (CR-009) | `/portal/settings/*` |
| Subscription — tenant (Phase 8) | `GET /organizations/{orgId}/subscription` → snapshot DTO or null; owners/GMs with billing access only, else 403 `BILLING_FORBIDDEN`. DTO carries plan-version snapshot label, latest-published label (info only), USD minor-unit price, per-resource included/used/usagePercent/warningLevel (backend-computed; credits flagged non-monetary; deferred resources `not_enabled`), renewal events, published add-ons (enabled/available), `billingContactEmail`. NO cost fields (CR-010) | `/portal/billing` |
| Integrations (Phase 8) | `GET /organizations/{orgId}/integrations` → flags `{key,name,description,status: enabled|not_enabled|coming_soon,noteLabel}`; UI renders not-enabled truthfully, no controls (CR-010) | `/portal/settings/integrations` |
| Platform admin (Phase 8) | All under `/admin/*`, platform-admin sessions only (403 `PLATFORM_ADMIN_FORBIDDEN`): `GET /admin/overview` · `GET /admin/resource-definitions` · `GET /admin/plans` · `GET/POST /admin/plans/{id}/versions` · `GET/PATCH …/versions/{vid}` (drafts only) · `POST …/versions/{vid}/{preview,approve,publish,retire,return-to-draft}` · `GET/POST /admin/addons` (+ version draft/patch/action) · `GET /admin/provider-rates` · `GET /admin/supply-pools` · `GET /admin/margins` · `GET/POST/PATCH /admin/quote-rules[/{id}]` · `GET/POST /admin/quotes` · `POST /admin/quotes/{id}/{send,accept,reject,convert}` · `GET /admin/audit-events?entityType&entityId&actor&from&to`. Public pricing (`GET /public/plans`) is the published-only projection of this catalogue (CR-010) | `/admin/*`, `/pricing` |

**Error shape:** `apps/frontend/src/api/errors.ts` extracts
status/code/message/requestId + field errors defensively. Provisional stable
codes assumed by Phase 3 UI: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`,
`EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_REGISTERED`, `TOKEN_EXPIRED`,
`TOKEN_INVALID` (CR-002).

## 3. Runtime configuration

- Frontend origin (local): `http://localhost:3000`
- Backend API base (local): `http://localhost:4000/api/v1`, supplied via
  `NEXT_PUBLIC_API_BASE_URL` (see `apps/frontend/.env.example`) and validated
  by `getApiBaseUrl()` — never hardcoded.

## 4. Auth / CORS / CSRF assumptions (to confirm against canonical contract)

These are **frontend implementation commitments**; the backend contract must
confirm the concrete mechanics before Phase 2 auth work starts:

1. **Session:** HttpOnly cookie issued by the backend. Every browser request
   uses `credentials: "include"` (enforced centrally in
   `apps/frontend/src/api/client.ts`). No auth/session token is ever stored
   in `localStorage`/`sessionStorage` or otherwise exposed to JS.
2. **Bootstrap:** the app will resolve the current session via the
   contract's `/auth/me` (or documented equivalent). Client-side role state
   is treated as display-only; the backend authorizes every operation.
3. **CORS:** backend must allow the frontend origin with credentials
   (no wildcard). Local pairing: `http://localhost:3000` → `:4000`.
4. **CSRF:** the client already supports an in-memory token provider that
   attaches `X-CSRF-Token` to unsafe methods (POST/PUT/PATCH/DELETE).
   **Open question for backend:** exact token endpoint, header name, cookie
   name (if double-submit), and rotation policy — to be taken from the
   contract, not assumed.
5. **Tenant scope:** after organization selection the client sends
   `X-Organization-Id`, and `X-Branch-Id` where branch context applies
   (both implemented + unit-tested). These are scoping hints only; backend
   validates scope/authorization on every request.
6. **Conventions to follow from the contract:** response envelopes,
   pagination shape, stable error codes, validation-error format, and
   request IDs — the frontend will centralize parsing of these once defined.

## 5. Live-tested vs mock

| Flow | Status |
|---|---|
| Any backend flow | **Not live-tested — no backend / no canonical contract yet.** |
| Dev mock transport (Phase 3) | In-memory deterministic fixtures, enabled ONLY via `NEXT_PUBLIC_API_TRANSPORT=mock` (dev preview + Vitest + Playwright), always behind a visible banner/hint boxes. Never a silent production substitute; production default is `contract`, which today reports features honestly as unavailable. Fixture plans/prices exist solely as labelled test data in `src/api/mock/`. |
| Verified in Phase 1 | Type generation from spec, staleness gate (pass + tamper-fail), env validation, client header/credential behaviour (unit tests with mocked fetch), production build, Playwright app-shell smoke test. |
| Verified in Phase 2 | Design tokens/primitives, route groups + shells, Dialog/Toast a11y behaviour, error translation, theme persistence (30 Vitest + 5 Playwright tests, production build incl. all new routes). No mocks introduced. |
| Verified in Phase 3 | Landing/pricing/pilot/auth/invite flows end-to-end against the mock transport; contract-transport honesty (empty pricing, unavailable writes) unit-tested; 58 Vitest + 11 Playwright tests; build with 14 routes. |

## 6. Contract mismatches / change requests

> Format: **CR-###** — Feature · Endpoint/schema · Problem · Impact ·
> Requested change · Status (open / accepted / rejected)

- **CR-001 — Public/auth/invite endpoints (Phase 3).** Contract publishes
  none yet; frontend mock assumes the table in §2. Impact: Phase 3 flows run
  on dev mock only. Request: publish these (or equivalents) with request/
  response schemas; frontend will regenerate + adapt services. · **open**
- **CR-002 — Error envelope + stable codes.** UI assumes codes listed in §2
  and a `fieldErrors`/`errors[]` validation shape. Request: document the
  envelope (incl. request ID field name) and stable code registry. · **open**
- **CR-003 — CSRF mechanics** (from §4): token endpoint, header/cookie names,
  rotation. Frontend seam ready (`setCsrfTokenProvider`). · **open**
- **CR-004 — Sign-up post-flow.** Frontend supports both verify-first and
  immediate-session outcomes. Request: confirm which the backend implements
  and whether sign-up collects initial organization name. · **open**
- **CR-005 — Invite lifecycle.** UI assumes invite states `ready` /
  `pending_approval` / expired / invalid and accept-with-password finalizes
  activation. Request: confirm states + which profile fields invitees may set. · **open**
- **CR-006 — Portal tenancy, dashboards & setup.** Phase 4 assumes (see §2):
  `GET /auth/organizations` returns the caller's memberships incl. role · lists
  are backend-authorized (branch managers never receive other branches) · 403s
  are authoritative regardless of client state · dashboard payloads carry
  metrics (org-currency minor units), per-branch rows, free-form `alerts[]`
  and `capacity {activeStudents, capacityLimit|null, usagePercent}` from API
  policy · capacity rule mirrored in UI: ≥80% warning, ≥90% stronger, ≥100%
  blocks only NEW qualifying enrollments (existing records/history never
  blocked) — **backend must enforce this rule itself; frontend only displays**
  · setup status exposes completion booleans (profile, branches,
  timezone+currency, academic year, staff/students onboarded). Provisional
  codes: `ORG_FORBIDDEN`, `ORG_NOT_FOUND`, `BRANCH_NOT_FOUND`,
  `BRANCH_FORBIDDEN`, `DASHBOARD_FORBIDDEN`. In `contract` transport,
  organizations/branches return `[]` honestly and dashboards/setup return
  `CONTRACT_UNAVAILABLE` until the canonical spec lands. · **open**
- **CR-007 — Students & academic structure.** Phase 5 assumes (see §2):
  a paged envelope `{items,total,page,pageSize}` with server-side
  `search` (name/code), `branchId`, `status`, `programId` filters · student
  detail carries guardians, enrollments (active/ended with dates) and
  branch history · branch scope is enforced on every read/write
  (out-of-scope branch → `BRANCH_FORBIDDEN`, missing → `STUDENT_NOT_FOUND`)
  · capacity is decided by the backend: creating a new ACTIVE student or
  enrollment (or reactivating) at 100% → `STUDENT_CAPACITY_FULL` (422);
  existing records/history never blocked · duplicate active enrollment in
  the same class → `ALREADY_ENROLLED` (409) · structural deletes blocked
  while in use → `PROGRAM_IN_USE` / `CLASS_IN_USE` / `SUBJECT_IN_USE` /
  `ACADEMIC_YEAR_IN_USE` (409) · academic-structure mutations assumed
  Owner/GM-only (others 403) while reads are branch-scoped · `isCurrent`
  on academic years is backend-computed (never derived client-side) ·
  timetable entries are weekly-recurring (weekday + UTC wall-clock
  `HH:mm`); the UI converts to the org timezone for display only.
  Questions for the backend: student-code format/uniqueness scope,
  guardian identity (shared person record vs per-student snapshot),
  transfer semantics for active enrollments (auto-end? re-map class?),
  timetable conflict detection, and whether BMs may edit structure for
  their own branch. In `contract` transport all Phase 5 services return
  `CONTRACT_UNAVAILABLE`. · **open**
- **CR-008 — Staff, attendance & devices.** Phase 6 assumes (see §2):
  staff list is the same paged envelope with server-side
  `search`/`branchId`/`departmentId`/`designationId`/`status` filters ·
  staff lifecycle = `invited → (pending approval) → active ⇄ inactive`,
  approval state carried separately (`none|pending|approved|rejected`) ·
  invite by email; duplicate pending/active email → `INVITE_ALREADY_EXISTS`
  (409) · unknown staff → `STAFF_NOT_FOUND` (404), out-of-scope branch →
  `BRANCH_FORBIDDEN` (403) · role changes are Owner/GM-only; others →
  `ROLE_CHANGE_FORBIDDEN` (403, UI copy: “You are not allowed to change
  this user's role.”) · removing the final active owner → `LAST_OWNER`
  (409) · users cannot deactivate themselves · staff detail carries an
  API-computed attendance summary (period present/late/absent/leave +
  percentage) — the UI renders it verbatim · student attendance statuses
  are exactly `present|absent|late|excused`; batch mark returns the full
  day with a backend-computed summary; marking a future date → 422 field
  error on `date` · QR sessions: joining code, `expiresAtUtc` (mock: +2h),
  check-in by token (mock token = student code; the real token format is
  the backend's choice); duplicate → `ALREADY_CHECKED_IN` (409),
  unknown/off-roster → 422 field error on `token`, expired session →
  `QR_SESSION_EXPIRED` (410) · staff day rows carry first-in/last-out UTC
  instants + backend-decided `present|late|absent|on_leave|missing_punch`
  + free-form flags — the frontend NEVER derives late/missing ·
  correction/leave approve|reject are manager actions; an approved leave
  overrides the day to `on_leave` server-side · devices: status
  (`not_configured|pending_verification|verified|offline`) and
  `lastHeartbeatUtc` are backend-owned; registration always returns
  `not_configured` with `null` heartbeat; unknown device →
  `DEVICE_NOT_FOUND`; K50 has NO verified state until a real connector
  exists. Questions for the backend: invite-token delivery/expiry and
  re-invite semantics, role catalog (fixed vs custom roles + permission
  matrix), approval workflow (who approves — owner only or GM too),
  attendance edit windows/locking (can past days be re-marked?), QR token
  format + kiosk auth, punch ingestion shape (device push vs poll) and
  late/missing policy config surface, device provisioning/heartbeat
  protocol for the K50 connector. In `contract` transport all Phase 6
  services return `CONTRACT_UNAVAILABLE`. · **open**
- **CR-009 Fees, student/parent portal, imports, help & settings
  (Phase 7, provisional).** Fees: structures targeted by academic
  program; voucher amount = Σcomponents − Σdiscounts (backend-computed
  totals on every DTO); statuses `due|partially_paid|overdue|settled`
  backend-derived; `dueDate` date-only; `periodLabel` free text (mock:
  "Oct 2026"-style); programs without a structure are skipped by
  generation, per-student generation is idempotent per period. Manual
  payments only: modes `cash|bank_transfer|cheque|other`, receipts
  carry `sourceLabel: "Manually recorded payment"` from API data; no
  gateway states exist; overpayment → 422 `PAYMENT_EXCEEDS_BALANCE`
  (field `amount`), settled → 409 `VOUCHER_ALREADY_SETTLED`, future
  `paidDate` → 422 (field `paidDate`). Reports (`collectedMinor`,
  `outstandingMinor`, overdue count, per-branch rows) are computed by
  the backend over date/branch/class filters; all money in the org's
  configured currency (preferences) + minor units. Student portal:
  `/auth/me` gains `kind: staff|guardian|student` (defaults staff) and
  `GET /me/students` resolves links server-side from the session; every
  `/me/students/{id}/*` re-checks the link (403 for others, incl. staff
  accounts); results are per-term published marks or absent (frontend
  shows "not yet available"); notices are org/branch broadcasts
  (documents/deferred — modeled as announcements list). Imports: kinds
  `students|staff|fees`; job `uploaded → mapped → validated →
  committed|discarded`; upload constraints surfaced (mock: CSV only —
  Excel is a server-side parse — 512 KB, `IMPORT_FILE_UNSUPPORTED`);
  mapping saved with the job; validation per-row with line numbers
  (header = line 1), duplicates flagged (in-file + existing directory),
  error report CSV `line,status,messages`; commit replays the same
  backend rules as manual flows (capacity, invite duplicates, unknown
  student code → `STUDENT_NOT_FOUND`); suggested auto-mapping matches
  normalized headers/aliases — real backend may template-match instead.
  Help: `GET /help/articles/{featureId}`, unknown features → null/404
  (UI shows minimal explanation, never a broken link); doc/video URLs
  only when the backend provides them. Settings: role→permission matrix
  from a permissions catalog; `owner` role system-locked
  (`ROLE_LOCKED`); academic preferences (`gradingScheme`,
  `lateThresholdMinutes`) live on org preferences; branch
  code/location/enabled fields exist with disable confirmed client-side
  (backend remains authoritative); change-password verifies the current
  password server-side (field error on `currentPassword`); session
  list/revoke endpoints; org profile gains `address`. New error codes:
  `VOUCHER_NOT_FOUND`, `FEE_STRUCTURE_NOT_FOUND`,
  `PAYMENT_EXCEEDS_BALANCE`, `VOUCHER_ALREADY_SETTLED`,
  `IMPORT_FILE_UNSUPPORTED`, `IMPORT_MAPPING_INCOMPLETE`,
  `IMPORT_NOT_READY`, `IMPORT_JOB_NOT_FOUND`,
  `LINKED_STUDENT_FORBIDDEN`, `CURRENT_PASSWORD_INVALID`,
  `ROLE_LOCKED`, `SESSION_NOT_FOUND`, `BRANCH_NOT_FOUND`. · **open**
- **CR-010 Subscription & platform admin (Phase 8, provisional).**
  Identity: `/auth/me` gains `isPlatformAdmin` (platform-level, distinct
  from org roles; platform admins hold no tenant memberships — tenant
  endpoints 403 their sessions, admin endpoints 403 everyone else with
  `PLATFORM_ADMIN_FORBIDDEN`). Tenant subscription:
  `GET /organizations/{orgId}/subscription` returns a **snapshot DTO or
  null**; billing access = owner/general-manager (else
  `BILLING_FORBIDDEN`) — backend must confirm whether "billing access"
  is a distinct permission rather than role-derived. Prices are USD
  minor units; resource usage (`usagePercent`, `warningLevel`)
  backend-computed; credits carry `isCredits` and are never money;
  deferred resources (WhatsApp, video) report
  `availability: not_enabled`; `latestPublishedVersionLabel` is
  informational — the subscription's own `planVersionLabel` snapshot is
  what runs. Open question: is the subscription's student allowance the
  source of truth for the Phase 4 dashboard `capacityLimit` (mock keeps
  them consistent for the primary demo org; backend should unify)?
  Add-on allowances: mock reports plan inclusion and enabled add-ons
  separately — backend to confirm whether `included` folds add-ons in.
  Catalogue: plan families have ordered versions
  (`draft|preview|approved|published|retired`); only drafts are mutable
  (409 `PLAN_VERSION_NOT_DRAFT`); illegal jumps → 409
  `PLAN_VERSION_STATE_CONFLICT`; publish accepts an optional effective
  timestamp (mock: scheduled publishes still project to public pricing
  immediately — backend to confirm projection timing for future-dated
  versions); publishing retires the prior published version and NEVER
  mutates subscriptions. `GET /public/plans` = published-only
  projection (public fields; null price = custom/Enterprise). Add-ons
  version identically and link to plans; only published add-on versions
  surface tenant-side. Cost model (ADMIN ONLY): provider rates
  (`unitCostMinor` + billing unit), supply pools (utilization ≥80%
  warning / ≥90% critical — thresholds are backend policy), per-version
  margin estimates (mock's cost figures are seeded engine outputs; a
  freshly published version may legitimately be "not estimated" —
  nulls). Tenant DTOs contain none of these fields. Quotes:
  `draft|sent|accepted|rejected|converted`; conversion copies the
  QUOTED version snapshot into a live subscription (mock: converts even
  if newer versions have since published — the required semantics);
  quote rules are admin-authored condition/formula labels (no pricing
  math client-side). Audit: append-only events
  `{occurredAtUtc, actorLabel, entityType, entityId, entityLabel,
  action, summary}` with type/actor/date filters. New error codes:
  `BILLING_FORBIDDEN`, `PLATFORM_ADMIN_FORBIDDEN`, `PLAN_NOT_FOUND`,
  `PLAN_VERSION_NOT_FOUND`, `PLAN_VERSION_NOT_DRAFT`,
  `PLAN_VERSION_STATE_CONFLICT`, `ADDON_NOT_FOUND`, `QUOTE_NOT_FOUND`,
  `QUOTE_STATE_CONFLICT`, `QUOTE_RULE_NOT_FOUND`. · **open**

## 7. Phase 1 verification evidence

- `npm run api:types` — generated `src/api/generated.ts` from the placeholder spec. ✅
- `npm run api:check` — passes on clean tree; fails (exit 1) after a hand-edit to `generated.ts`. ✅
- `npm run typecheck` — strict `tsc --noEmit` clean. ✅
- `npm run lint` — ESLint clean. ✅
- `npm run test` — 9/9 Vitest tests pass (home page, env validation, client config/headers/CSRF). ✅
- `npm run build` — production build succeeds; `/` prerendered. ✅
- `npm run e2e` — Playwright smoke test passes (Chromium). ✅

## 8. Phase 2 verification evidence

- `npm run typecheck` / `npm run lint` — clean (strict TS, ESLint flat config). ✅
- `npm run test` — 30/30 Vitest tests pass (primitives, Dialog focus/Escape/backdrop, Toast live region, FormField wiring, feedback states, theme, error translation, Phase 1 client/env). ✅
- `npm run build` — succeeds; `/`, `/pricing`, `/request-pilot`, `/auth/sign-in`, `/portal`, `/design-system`, `/student`, `/admin` all prerender. ✅
- `npm run e2e` — 5/5 Playwright tests (route groups navigable, portal mobile drawer, dialog+toast, theme persistence). ✅
- `npm run api:check` — still passes; contract/client untouched in Phase 2. ✅

## 9. Phase 3 verification evidence

- `npm run typecheck` / `npm run lint` — clean. ✅
- `npm run test` — 58/58 Vitest tests (adds: landing, money incl. zero-decimal PKR/JPY, services in both transports, pricing states, sign-in/pilot/invite forms, field-error extraction, Alert). ✅
- `npm run build` — succeeds; 14 routes (`/auth/*`, `/invite/[token]` dynamic). ✅
- `npm run e2e` — 11/11 Playwright tests (mock transport): pricing, pilot, sign-in→portal→sign-out, unverified+resend, invite pending/ready, verify/reset tokens. ✅
- `npm run api:check` — still passes; contract/client untouched in Phase 3. ✅
- Notable find: Zod v4's default email check rejects reserved domains — frontend email schemas use a pragmatic format regex (backend remains authority). Documented in `src/lib/schemas.ts`.

## 10. Phase 4 verification evidence

- `npm run typecheck` / `npm run lint` — clean. ✅
- `npm run test` — 83/83 Vitest tests (capacity thresholds 80/90/100 + non-blocking copy, date-range resolution, role-aware nav matrix, portal services incl. BM scoping/403s, capacity banner; sign-in asserts the org-chooser redirect). ✅
- `npm run build` — succeeds; 29 routes (portal dashboard, branch, settings ×5, feature stubs; `/auth/organizations`). ✅
- `npm run e2e` — 18/18 Playwright tests (mock transport): portal guard w/ `next`, 0-org message, chooser → org dashboard, org switch → 85% capacity warning, BM restricted view w/ 100% guidance, fresh-org checklist advancing, drill-down filter propagation. ✅
- `npm run api:check` — passes; `openapi.yaml` untouched; Phase 4 endpoints provisional (CR-006). ✅

## 11. Phase 5 verification evidence

- `npm run typecheck` / `npm run lint` — clean. ✅
- `npm run test` — 103/103 Vitest tests (adds: directory pagination/search/filters, BM branch scoping incl. hidden-student 403 + unknown-student 404, create+initial-enrollment, `STUDENT_CAPACITY_FULL` on create and reactivate at 100%, `ALREADY_ENROLLED`, transfer history, academics CRUD gates + `*_IN_USE` deletes, `isCurrent` from API, timetable entries, UTC→org-timezone conversion incl. half-hour zones). ✅
- `npm run build` — succeeds; new routes `/portal/students`, `/portal/students/[studentId]`, `/portal/academics{,/years,/programs,/classes,/subjects}`, `/portal/academics/classes/[classId]/timetable`. ✅
- `npm run e2e` — 25/25 Playwright tests (mock transport): directory search/pagination/status filter, add-student round-trip, detail guardians + duplicate-enrollment message + confirmed branch transfer, Riverdale capacity-block with form data preserved, student-not-found 404 (which also caught + fixed a Phase 4 bug: the sign-in page's leftover "already signed in → /portal" effect stomped the `next` deep link), fresh-org empty directory, academics program CRUD + in-use delete explanation, timetable rendering 08:00 local from 03:00 UTC + adding a session. ✅
- `npm run api:check` — passes; contract untouched; Phase 5 endpoints provisional (CR-007), dev-mocked, `CONTRACT_UNAVAILABLE` in contract transport. Students/Academic-structure nav items lost their "Soon" badges. ✅

## 12. Phase 6 verification evidence

- `npm run typecheck` / `npm run lint` — clean (incl. react-hooks refs/set-state-in-effect rules; the attendance editor uses a keyed edits-overlay, no effect syncing). ✅
- `npm run test` — 118/118 Vitest tests (adds 15 Phase 6 service tests: staff pagination/filters incl. multi-branch membership semantics, fresh-org empty directory, duplicate invite, approve + activate round-trip, `LAST_OWNER` + self-deactivate protection, branch-manager `ROLE_CHANGE_FORBIDDEN`, role/branch assignment; batch marking + backend summary, future-date 422, QR check-in write-through + `ALREADY_CHECKED_IN` + unknown-token 422; backend staff flags incl. seeded correction/leave + approved-leave day effect; device honesty — only API-verified devices report verified (with heartbeat), registration ⇒ `not_configured`/null heartbeat, fresh org has none). ✅
- `npm run build` — succeeds; 37 routes incl. `/portal/staff`, `/portal/staff/[staffId]`, `/portal/attendance{,/students,/qr,/staff,/requests}`, `/portal/devices`. ✅
- `npm run e2e` — 33/33 Playwright tests (mock transport): everything through Phase 5 plus Phase 6 — directory badges + pending-approval approve flow, invite round-trip, last-owner removal blocked with friendly copy, mark-all-present + save with backend summary, QR session (Grade 10-A) check-in + duplicate caught, backend "Late by 25 min"/"Missing check-out" rows, seeded correction approval, K50 "Pending verification" (no fake green) + new registration "Not configured"/"Never seen". ✅
- `npm run api:check` — passes; `openapi.yaml` untouched (SHA-256 unchanged); Phase 6 endpoints provisional (CR-008), dev-mocked, `CONTRACT_UNAVAILABLE` in contract transport. Staff/Attendance/Devices nav items lost their "Soon" badges; the Settings → Onboarding bridge now links the live directories (imports still honestly Phase 7). ✅
- Notable finds: (1) a latent sign-in race — the page's "already signed in → `next ?? /portal`" effect also fired for the form's own successful sign-in, occasionally beating the navigation to the org chooser; fixed with a submitted-state guard (deep-link `next` behavior preserved, regression-covered by the Phase 5 404 deep-link test). (2) Screenshots in `/screenshots/phase6/` (directory, pending-approval detail, student marking, QR check-in, staff flags, requests, honest devices). ✅

## 13. Phase 7 verification evidence

- `npm run typecheck` / `npm run lint` — clean. ✅
- `npm run test` — 134/134 Vitest tests (adds 16 Phase 7 service tests: money minor-unit parsing by currency exponent (PKR/USD/JPY); fee structures & voucher balances/status derivation incl. scholarship discount variant, overpay/settled/future-date rejection, partial payment math, idempotent generation, report aggregates + branch scoping; guardian session — linked students only, unlinked 403, staff rejected, results present vs absent; import validation — duplicate flags + unknown branch, mapping-incomplete, commit writes to directory; settings — role-permission save, Owner `ROLE_LOCKED`, wrong-current-password field error, session revocation, help fallback null). ✅
- `npm run build` — succeeds; 50 routes incl. `/portal/fees{,/structures,/vouchers,/vouchers/[id]}`, `/student{,/attendance,/timetable,/fees,/notices,/results}`, `/portal/imports{,/students,/staff,/fees}`, `/portal/settings/{academic,roles,security}`. ✅
- `npm run e2e` — 38/38 Playwright tests (mock transport): everything through Phase 6 plus Phase 7 — generate Nov vouchers → open voucher → record cash payment → "Manually recorded payment" receipt + PKR 11,000 balance; guardian sign-in lands in `/student` (org chooser skipped), sees only linked students, published results for one child + "not available yet" for the sibling, `/portal` shows the friendly refusal; students CSV upload → auto-mapping → validation (1 valid / 1 invalid) → confirmed commit → student searchable in the directory; roles (Owner locked) + permission save + wrong-password field error; dashboard Help panel. The Phase 2 shell E2E was migrated: `/student` is now the real linked-student area (signed-out heading), not a placeholder. ✅
- `npm run api:check` — passes; `openapi.yaml` untouched (SHA-256 unchanged); Phase 7 endpoints provisional (CR-009), dev-mocked, `CONTRACT_UNAVAILABLE` in contract transport. Fees/Imports nav items lost their "Soon" badges — Billing & subscription and Platform admin remain, correctly, for Phase 8. ✅
- Money honesty: receipts render API data only (voucher, student, amount, mode, reference, paid date, remaining balance) labeled "Manually recorded payment"; no checkout, gateway, or bank-status UI exists anywhere. Screenshots in `/screenshots/phase7/` (fees overview, vouchers, voucher detail, import validation, roles matrix, student home, student fees). ✅

## 14. Phase 8 verification evidence & endpoint verification inventory

- `npm run typecheck` / `npm run lint` — clean. ✅
- `npm run test` — 144/144 Vitest tests (adds 10 Phase 8 service tests + 1 updated nav expectation: subscription snapshot with live usage (744/1,200 students, 62%), credits vs money, deferred `not_enabled` resources; `BILLING_FORBIDDEN` for branch managers, null subscription for fresh orgs; admin gate 401/403; published-only pricing projection; lifecycle — clone→edit→preview→approve→publish retires v3, pricing shows the new price, **Sunrise subscription still on its Growth v2 / $45 snapshot**; `PLAN_VERSION_NOT_DRAFT` + state-conflict rejections; add-on draft→published; quote convert activating Fresh Start on Growth v3 ($294/yr, add-on enabled) + `QUOTE_STATE_CONFLICT`; audit emission + actor/entity filters; pool critical/warning + Starter margin 13.2% warning; integrations never `enabled`). ✅
- `npm run build` — succeeds; 56 routes incl. `/portal/billing`, `/portal/settings/integrations`, `/admin{,/plans,/plans/[planId],/plans/[planId]/versions/[versionId],/resources,/addons,/quotes,/audit}`. ✅
- `npm run e2e` — 42/42 Playwright tests (mock transport): everything through Phase 7 plus Phase 8 — tenant billing (Growth v2 snapshot, “newer version published” note, 744 students, pilot-managed alert, WhatsApp “Not enabled”, **zero pay/checkout/upgrade buttons, zero margin text**) and branch-manager “Billing is restricted” after org switch; admin lifecycle end-to-end (clone Growth v3→v4, price $59, impact panel, publish, `/pricing` shows $59.00) with resources page proving internal rates exist admin-side; quote conversion → tenant owner sees Growth v3 / $294/yr in billing; tenant session deep-linking `/admin` lands on “Platform admins only”. Phase 2 shell spec migrated again (`/admin` now gated; **no “Soon” badges remain anywhere in tenant nav**). ✅
- `npm run api:check` — passes; `openapi.yaml` untouched (SHA-256 `d6294db1…` unchanged since Phase 1); Phase 8 endpoints provisional (CR-010), dev-mocked, `CONTRACT_UNAVAILABLE` in contract transport. ✅
- Notable: public pricing is now a **projection of the admin catalogue** in the mock (`getMockPublishedPlans`) — the static Phase 3 fixtures were deleted, so drafts physically cannot leak into `/pricing`. Screenshots in `/screenshots/phase8/` (tenant billing, integrations, admin overview, version editor, resources & rates, quotes). ✅

### Endpoint verification status (all feature areas)

**No endpoint in this project has been tested against a live backend**,
because no canonical contract or backend has been published to date
(§1). Every area below is verified against the deterministic dev mock
behind the typed service seam (`services/*.ts`), with unit + E2E coverage
as noted. When the canonical contract lands, each row moves to “live”
only after its adapter replaces the mock branch and the same suites pass
against a real server.

| Feature area | Assumed endpoints (see §2) | Verified against | Coverage |
|---|---|---|---|
| Auth (sign-up/in/out, verify, reset, /auth/me, change-password, sessions) | CR-001/002/009 | Dev mock only | Unit + E2E (incl. locked/unverified/expired-token states, session-expiry redirect) |
| Public plans & pilot requests | CR-001/003 | Dev mock only (pricing now projects the admin catalogue) | Unit (incl. contract-mode “unavailable”, never fabricated prices) + E2E |
| Organizations, branches, dashboards, setup | CR-006 | Dev mock only | Unit + E2E (org switch, BM scoping, capacity 80/85/100%) |
| Students & guardians/enrollments/transfers | CR-007 | Dev mock only | Unit + E2E (duplicate `ALREADY_ENROLLED`, capacity block with input preserved, transfer) |
| Academic structure & timetable | CR-007 | Dev mock only | Unit + E2E (in-use delete refusals, UTC→org-timezone rendering) |
| Staff & invites/approvals | CR-008 | Dev mock only | Unit + E2E (pending approval → activation, last-owner guard) |
| Attendance (manual, QR, staff, corrections/leave) | CR-008 | Dev mock only | Unit + E2E (duplicate QR scan, backend late/missing flags) |
| Devices | CR-008 | Dev mock only | Unit + E2E (registration ⇒ `not_configured`, no fake heartbeat) |
| Fees (structures, vouchers, manual payments, receipts, reports) | CR-009 | Dev mock only | Unit + E2E (honest “Manually recorded payment” receipts) |
| Student/parent portal (/me/students) | CR-009 | Dev mock only | Unit + E2E (linked-only 403s, results present vs unavailable) |
| Imports (upload→map→validate→commit, error report) | CR-009 | Dev mock only | Unit (incl. error-report content) + E2E (upload→commit into directory) |
| Tutorials/help | CR-009 | Dev mock only | Unit (unknown feature → fallback) + E2E |
| Settings (profile, branches, preferences, roles, security, integrations) | CR-006/009/010 | Dev mock only | Unit + E2E |
| Subscription (tenant) | CR-010 | Dev mock only | Unit + E2E (snapshot principle, no checkout, BM 403) |
| Platform admin (catalogue, add-ons, rates/pools/margins, quotes, audit) | CR-010 | Dev mock only | Unit + E2E (full lifecycle → pricing; quote conversion) |

### Remaining unverified / assumptions needing backend confirmation

1. **CSRF flow** — token endpoint + header name still undocumented; the
   central client attaches an in-memory token to unsafe methods once the
   contract names them (never disabled, never in web storage).
2. **Error envelope + stable code registry** — extraction is defensive;
   all codes in `src/api/errors.ts` are provisional (CR-001…CR-010) and
   must be reconciled to the contract's registry.
3. **Envelope/pagination conventions** — `{items,total,page,pageSize}`
   assumed (CR-007); request-ID field name assumed (`requestId`).
4. **Billing access rule** — owner/GM role-derived in the mock; backend
   to confirm whether billing is a separate permission (CR-010).
5. **Capacity source of truth** — subscription student allowance vs
   dashboard `capacityLimit` should unify server-side (CR-010).
6. **Scheduled-publish projection** — whether future-effective versions
   appear in `GET /public/plans` immediately or at their effective time
   (CR-010).
7. **Margin/pool thresholds & cost engine** — 80/90% pool and 10/25%
   margin bands are mock policy; the real thresholds and utilization
   model are backend-owned (CR-010).
8. **Excel import parsing, K50 connector protocol, invite-token
   delivery, QR token format** — carried from CR-008/CR-009.
9. **Deferred integrations** (WhatsApp, video, both gateways, payroll,
   extra biometrics, native apps) remain flag-driven not-enabled states
   until the backend enables them; no frontend simulation exists.

## 15. Full-spec audit remediation (post-Phase 8)

A requirement-by-requirement audit of the delivered app against the
Phase 1–8 specification confirmed the route inventory, design-system
coverage, spec-exact table columns, effective-dated transfers, capacity
90% tests, CSRF seam, and the attendance/billing rules as implemented.
Eight genuine gaps were found and closed in the frontend (no contract
change — the placeholder spec's SHA-256 is unchanged):

1. **Manual fee payments now require an explicit review → confirm step**
   before the POST fires (money dialog rule). The review shows student,
   voucher, formatted amount, mode, date, reference, and the resulting
   balance.
2. **Bulk voucher generation** dialog copy now states the exact
   consequence (one voucher per active student per period; existing
   vouchers skipped and never altered).
3. **Organization logo is a real upload seam** instead of a pasted URL:
   `uploadOrganizationLogo` in `services/setup.ts`. *Addendum to CR-005 —
   assumed endpoint:* `POST /organizations/{orgId}/logo` (multipart); the
   backend owns file rules (image types, size cap; violations as 422
   field errors on `logo`) and returns the stored `logoUrl`; the frontend
   never invents storage URLs and never logs file contents.
4. **Staff attendance gained the department dimension** (spec: per
   day/branch/department): rows carry `departmentName` and the day
   endpoint accepts a `departmentId` filter. *Addendum to CR-008:*
   `GET /organizations/{orgId}/attendance/staff?date&branchId&departmentId`.
5. **E2E coverage completed to the Phase 8 minimum list** (`e2e/audit.spec.ts`):
   sign-up journey, signed-out portal deep link + return after sign-in,
   pricing with zero published plans, 500-error recovery preserving form
   entries (mock trigger email `@demo-outage.test`, documented in the
   mock header), and the import error-report CSV download.
6. **Query keys centralized** in `src/api/query-keys.ts` (156 literal
   sites migrated, byte-identical key shapes — cache identity unchanged;
   `AUTH_ME_QUERY_KEY` now aliases `queryKeys.auth.me`).
7. **Page routes centralized** in `src/lib/routes.ts` (165 navigation
   literals migrated across `href`, `router.push/replace`, and nav
   configs; pathname guards and API paths deliberately untouched).
8. **Dead code removed** (`feature-stub.tsx`, `placeholder-page.tsx` —
   zero consumers) and stale doc references refreshed.

New unit coverage: `audit-fixes.test.ts` (logo rules + persistence,
department filtering, pilot 500 trigger) — suite now 150/150.
