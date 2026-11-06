# Fluxeaze — Education Operations OS

Multi-tenant operations platform for schools, colleges, academies, coaching
centres and technical/vocational institutes.

> *Make work flow easier. Manage less. Accomplish more.*

**Current status: Phases 1–8 complete — the MVP frontend is feature-complete**
(all tenant modules, the student/parent area, tenant billing, and the
platform-admin catalogue), wired through the typed service seam. The one
outstanding item is the **canonical OpenAPI contract** itself: until the
backend publishes it, the `contract` transport degrades honestly and all
flows are exercised against the dev mock (CR-001…CR-010).

> **Demo mode works out of the box.** With no backend URL configured, the app
> automatically uses the deterministic in-memory mock and shows a visible
> banner, so every screen is clickable in a fresh checkout or preview. Set
> `NEXT_PUBLIC_API_BASE_URL` (and optionally `NEXT_PUBLIC_API_TRANSPORT=contract`)
> to switch to the real API. See [Demo mode](#demo-mode-no-backend) below.
> A full requirement-by-requirement review is in
> [PROJECT_AUDIT.md](./PROJECT_AUDIT.md).
Phase 1 scaffolded the monorepo + OpenAPI pipeline; Phase 2 added the
design system, layout shells and route groups (showcase at `/design-system`,
see [apps/frontend/docs/design-system.md](./apps/frontend/docs/design-system.md)).
Phase 3 delivered the landing page, API-shaped pricing, the request-pilot
form, full auth, the invite flow and a `/auth/me` bootstrap hook — all wired
through a typed **service seam** with two transports (see “Transports”
below), because the canonical API contract is **still unpublished**
(tracked with change requests in
[BACKEND_INTEGRATION_REPORT.md](./BACKEND_INTEGRATION_REPORT.md)).
Phase 4 adds the authenticated portal: `/portal` guard (unauthenticated →
sign-in with a safe `next`), the `/auth/organizations` chooser (0 orgs →
contact-admin message · 1 → auto-continue · many → cards), top-bar
org/branch switchers that set `X-Organization-Id` / `X-Branch-Id`, a
guided **non-blocking** setup checklist with working Settings forms
(profile, branches, timezone & currency, academic year), org + branch
dashboards (date filters, branch comparison, drill-downs carrying
filters onto honest feature stubs), API-driven **capacity warnings**
(≥80% / ≥90% / 100% blocks only *new* enrollments — existing records are
never blocked) and role-aware navigation. Client role checks are a
convenience only: the mock (like the future backend) 403s the org
dashboard for branch managers and scopes their branch lists.
Phase 5 replaces the Students and Academic-structure stubs with the real
thing: a server-paginated student directory (debounced search, branch /
status / program filters), add/edit students, a detail page with
guardians, enrollment history, branch transfers and status lifecycle,
full academic-structure CRUD (years, programs, classes, subjects +
class-subject assignment) and a weekly timetable that renders UTC times
in the organization's timezone. Capacity and duplicate decisions stay
with the (mock) backend — `STUDENT_CAPACITY_FULL` at 100% and
`ALREADY_ENROLLED` surface as friendly, blocking messages.
Phase 6 added staff, attendance (manual + QR) and honest devices;
Phase 7 fees, the student/parent area, imports, contextual help and the
full settings surface; Phase 8 (below) tenant billing, the platform-admin
plan catalogue with its draft→publish lifecycle, and truthful
deferred-integration states. Every phase section below describes its
surface; nothing is a labeled stub anymore.

---

## Repository layout

```
.
├── apps/
│   └── frontend/            # Next.js 16 (App Router) + React 19 + TS + Tailwind 4
│       ├── src/app/         # App Router: (public)/(portal)/(student)/(admin) groups
│       ├── src/components/  # ui/ primitives · feedback/ states · layout/ shells · theme/
│       ├── src/api/         # Generated OpenAPI types + central apiClient + error translation
│       ├── docs/            # design-system.md
│       ├── src/lib/         # Runtime env validation (getApiBaseUrl)
│       ├── e2e/             # Playwright E2E tests
│       ├── scripts/         # api:check staleness guard
│       └── .env.example     # Environment template (no secrets)
├── packages/
│   └── api-contract/
│       └── openapi.yaml     # Canonical API contract — SINGLE SOURCE OF TRUTH
├── contracts/
│   └── CONTRACT_VERSION.txt # Consumed contract version + SHA-256
├── BACKEND_INTEGRATION_REPORT.md
├── PROJECT_AUDIT.md         # Full project review: inventory, scorecard, gaps
├── .github/workflows/ci.yml # Typecheck · lint · test · contract · build
└── package.json             # npm-workspaces root (delegates all scripts)
```

`apps/backend` is owned by the backend team and is not part of this
frontend-only deliverable. The frontend never implements business APIs in
Next.js route handlers/server actions; every persisted operation goes through
the backend REST API.

## Prerequisites

- **Node.js 24 LTS** (see `.nvmrc`; Node ≥ 20 works) and **npm ≥ 11**
  (Node 24 ships npm 11; npm 10 can hit an Arborist `edgesOut` bug with this
  workspace's peer graph).
- The Fluxeaze **backend running locally** for any future API-dependent work:
  - Frontend: `http://localhost:3000`
  - Backend API base: `http://localhost:4000/api/v1`

## Setup

```bash
# 1. Install dependencies (npm workspaces — run from repo root)
npm install

# 2. Run immediately in demo mode (no backend needed)
npm run dev
# open http://localhost:3000 — sign in with owner@demo.fluxeaze.test
# (any password). The banner confirms demo mode.

# 3. For real API work, configure the backend URL
cp apps/frontend/.env.example apps/frontend/.env.local
# .env.local must define: NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1

# 4. (First time only) install the Playwright browser for E2E
cd apps/frontend && npx playwright install chromium && cd ../..
```

### Demo mode (no backend)

If `NEXT_PUBLIC_API_BASE_URL` is not set and `NEXT_PUBLIC_API_TRANSPORT` is
not set, the app selects the **mock transport** automatically. This is a
deliberate demo fallback so a fresh clone, a preview or a design review is
fully usable without a server. It is always announced by the top banner and
the amber `MockHint` boxes, and it is never used silently in production: a
real deployment sets the backend URL (which selects `contract`).

Demo accounts (any password with 8+ characters):

| Account | Area |
|---|---|
| `owner@demo.fluxeaze.test` | Staff owner — 4 organizations (owner, GM, branch manager, empty org) |
| `guardian@demo.fluxeaze.test` | Student/parent area — 2 linked students |
| `admin@fluxeaze.test` | Platform-admin area — plans, rates, quotes, audit |
| `noorg@fluxeaze.test` | Authenticated user with no organization |
| `locked@fluxeaze.test` / `unverified@fluxeaze.test` | Auth error scenarios |

Environment rules:

- `NEXT_PUBLIC_API_BASE_URL` is the **only** way the frontend learns the API
  base URL — production URLs are never hardcoded. It is validated at runtime
  by `getApiBaseUrl()` (`apps/frontend/src/lib/env.ts`), which throws a clear,
  actionable error when the variable is missing or not an absolute http(s) URL.
- `.env.example` lives at `apps/frontend/.env.example` and contains **no**
  credentials. Real env files (`.env*.local`) are gitignored.

## Commands (all run from repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 3000 |
| `npm run lint` | ESLint (flat config; see deviation note below) |
| `npm run typecheck` | `tsc --noEmit` (strict TypeScript) |
| `npm run test` | Vitest unit/component tests |
| `npm run e2e` | Playwright E2E tests (boots the dev server itself) |
| `npm run api:types` | Regenerate `apps/frontend/src/api/generated.ts` from the contract |
| `npm run api:check` | Fail if the generated client is stale vs the contract (CI gate) |

### Backend expectations (for integrators)

The frontend expects the backend (base URL from `NEXT_PUBLIC_API_BASE_URL`)
to provide:

- **Cookie session auth** — HttpOnly session cookie; every browser request
  is sent with `credentials: "include"` and tokens are never stored in
  web storage. Bootstrap/identity (incl. user `kind` and platform-admin
  flag) comes from the `/auth/me` equivalent.
- **CORS** — the frontend origin (`http://localhost:3000` in dev, the
  deployed origin in prod) allow-listed **with credentials**, and the
  `X-Organization-Id` / `X-Branch-Id` + CSRF headers permitted.
- **CSRF** — a documented token endpoint/header; the central client
  attaches the token (in memory only) to unsafe methods once the contract
  names the flow (see BACKEND_INTEGRATION_REPORT.md for the open question).
- **Contract-first errors** — stable `code`, `message`, `requestId` and
  field errors per the documented envelope; the frontend translates them
  centrally (`src/api/errors.ts`) and always preserves the request ID.
- **Money as minor units + explicit currency** everywhere (USD catalogue;
  org ledgers in the org's configured currency); the frontend never
  guesses a currency and never renders internal credits as money.

## API contract workflow

`packages/api-contract/openapi.yaml` is the single source of truth. The
frontend **never edits it** and **never invents endpoints or response shapes**.

- **When to run `api:types`:** after every contract update, and before
  starting any API-dependent feature work. It runs
  `openapi-typescript packages/api-contract/openapi.yaml --output apps/frontend/src/api/generated.ts`.
- **`api:check` (CI):** verifies (1) the SHA-256 of `openapi.yaml` matches
  `contracts/CONTRACT_VERSION.txt`, and (2) a fresh generation is
  byte-identical to the committed `generated.ts`. Hand-edits and stale
  output fail the check.
- **`contracts/CONTRACT_VERSION.txt`:** records the consumed contract version
  and SHA-256. Update it on every contract bump — step-by-step instructions
  are inside the file. Commit `openapi.yaml` + `generated.ts` +
  `CONTRACT_VERSION.txt` together.
- **Consuming the API:** use the central client in
  `apps/frontend/src/api/client.ts` (`apiClient()`), built on `openapi-fetch`
  with the generated types. It already enforces `credentials: "include"`
  (HttpOnly session cookie — tokens are never stored in web storage),
  attaches `X-Organization-Id` / `X-Branch-Id` once a tenant context is
  selected, and attaches an in-memory CSRF token to unsafe methods once the
  contract documents the CSRF flow. Full assumptions:
  [BACKEND_INTEGRATION_REPORT.md](./BACKEND_INTEGRATION_REPORT.md).

> ⚠️ **Contract status (unchanged in Phase 2):** the checked-in `openapi.yaml` is an
> explicitly-marked **placeholder with zero endpoints** so the generation
> pipeline could be verified. When the backend publishes the canonical
> baseline, replace it, run `api:types`, update `CONTRACT_VERSION.txt`, and
> fix resulting type errors. Never hand-edit `generated.ts` to work around a
> mismatch — file a contract change request in the integration report.

## Design system & routes (Phase 2)

- **Tokens & primitives:** colour/spacing/radii/shadow/typography CSS
  variables (light + dark), Tailwind 4 mapping, and accessible
  `Button/Input/Select/Textarea/Checkbox/Radio/FormField/Card/Badge/Table/
  Dialog/ConfirmDialog/Toast/Skeleton` components. Live showcase at
  **`/design-system`**; guide: `apps/frontend/docs/design-system.md`.
- **Data states:** `PageLoading`, `EmptyState`, `ErrorState` (retry +
  request ID) and `normalizeApiError` (`apps/frontend/src/api/errors.ts`)
  mapping HTTP statuses to friendly copy. Root `loading.tsx` / `error.tsx` /
  `not-found.tsx` / `global-error.tsx` wire these into routing.
- **Route groups:** `(public)` → `/`, `/pricing`, `/request-pilot`,
  `/auth/*` (incl. `/auth/organizations`), `/invite/[token]`,
  `/design-system` (moved out of the portal group in Phase 4 — the portal
  is now authenticated); `(portal)` → dashboards, students, academics,
  staff, attendance, devices, fees, imports, `/portal/settings/*`,
  `/portal/billing`; `(student)` → `/student{,/attendance,/timetable,
  /fees,/notices,/results}` (linked students only); `(admin)` →
  `/admin{,/plans,/resources,/addons,/quotes,/audit}` (platform admins
  only). TanStack Query + Theme + Toast + Tenant providers mount once in
  the root layout.

## Public pages, pricing, pilot & auth (Phase 3)

- **Landing `/`** — honest marketing (features + trust/security + CTAs);
  deferred integrations (WhatsApp, video, gateways, payroll) are explicitly
  labelled “not live features —”.
- **Pricing `/pricing`** — published plans via the plans service; prices are
  API minor units formatted with each plan's currency (`src/lib/money.ts`);
  skeleton / empty (“Plans are being prepared…” — never fabricated) / error+retry.
- **Request pilot `/request-pilot`** — React Hook Form + Zod, TanStack
  mutation; success panel, backend field errors mapped onto fields, entries
  preserved on network/server errors.
- **Auth** — `/auth/sign-up`, `/auth/sign-in`, `/auth/forgot-password`,
  `/auth/reset-password?token=`, `/auth/verify-email?token=` with
  invalid-credentials / locked / unverified (+resend) / expired-token states.
- **Invite `/invite/[token]`** — summary + `pending_approval` (no password
  setup) vs `ready` (profile + password setup) vs invalid/expired states.
- **Bootstrap** — `useAuth` (`src/hooks/use-auth.ts`) mirrors `/auth/me` for
  header/portal chrome and auth-page redirects. Sign-in success now routes
  to the org chooser (or a safe relative `next`) — Phase 4 below.

### Transports: contract vs dev-mock

UI code only calls `apps/frontend/src/api/services/*`. `NEXT_PUBLIC_API_TRANSPORT`
selects the transport: **`contract`** (default — generated client; pre-contract
— the UI honestly reports features unavailable / pricing empty) or
**`mock`** (deterministic in-memory fixtures for **local dev/test only**, with
a visible banner + scenario hints; **never** set it in production). Assumed
endpoints + error codes are logged as CR-001…CR-010 in the integration
report; when the canonical contract lands, only the service adapters change.

## Portal foundation & dashboards (Phase 4)

- **Route protection** — `(portal)` layout gates on `/auth/me` via TanStack
  Query; unauthenticated → `/auth/sign-in?next=<path>`; users without an
  organization (or with several unchosen) → `/auth/organizations`. Backend
  401/403s remain authoritative (the mock enforces them the same way).
- **Organization chooser `/auth/organizations`** — 0 orgs → “contact your
  administrator”; 1 → auto-continue; many → cards with role + current badge.
  Mock scenarios: `owner@demo.fluxeaze.test` has 4 orgs (Owner 62% ·
  General Manager 85% · Branch Manager at 100% · fresh empty org);
  `noorg@fluxeaze.test` has none.
- **Tenant context** (`TenantProvider`) — derives the active org/branch
  from backend-authorized lists, syncs `X-Organization-Id` / `X-Branch-Id`
  on the API client, persists ids in sessionStorage (cleared on sign-out);
  branch managers are pinned to an allowed branch, Owners/GMs get an
  “All branches” view. Top bar: org + branch switchers, role badge, user.
- **Dashboards** — `/portal` (Owner/GM org dashboard: students, staff,
  attendance %, outstanding fees, per-branch comparison, API alerts,
  capacity meter; branch managers get a 403 → restricted notice + their
  branch view) and `/portal/branch`. URL date filters (today / 7d / 30d /
  custom) refetch; metric cards drill into Students/Staff/Attendance/Fees
  with `from/to/branch` preserved (feature stubs echo them until those
  phases land). Skeleton / empty+CTA / error+retry / 403 states throughout.
- **Capacity warnings** — from API-reported usage: ≥80% warning banner,
  ≥90% stronger, 100% “new enrollments blocked” guidance that explicitly
  keeps existing records, assessments and fee history accessible.
- **Guided setup** — non-blocking, dismissible checklist on the dashboard
  (profile · branches · timezone & currency · academic year · staff ·
  students) backed by setup status; `/portal/settings/*` holds the working
  forms (profile, branch list+add, preferences, academic-year basics,
  onboarding bridge). Nothing in the portal is hard-blocked by setup.
- **Role-aware navigation** — billing (Owner), settings/imports (Owner+GM)
  hidden for branch managers as a convenience; the backend decides access.

## Students & academic structure (Phase 5)

- **Student directory `/portal/students`** — TanStack Query over a paged
  API (`page`/`pageSize` 10/25/50 + totals), debounced (400ms) search sent
  as a backend param, branch/status/program filters in the URL, skeleton
  rows, a "No students yet." empty state with Add/Import CTAs, and
  dashboard drill-downs landing here with their branch honored. Mock
  directory: Sunrise 32 · Northgate 24 · Riverdale 10 visible to its
  branch manager (4 hidden-branch students 403 everywhere).
- **Create/edit** — React Hook Form + Zod dialogs; backend field errors map
  onto fields, network/5xx keep filled data and the dialog open; optional
  initial enrollment (program → dependent class → start date).
- **Student detail `/portal/students/[id]`** — profile, guardians
  (link/unlink with confirmations), admissions & enrollment history with
  end-enrollment, branch history, confirmed branch transfers, and
  withdraw/alumni/reactivate status actions. Unknown students render a
  real "Student not found" state; out-of-scope branches a permission
  message — never a crash.
- **Capacity & duplicates (backend-decided)** — at 100% the mock API
  returns `STUDENT_CAPACITY_FULL` for new active students/enrollments and
  reactivations, and `ALREADY_ENROLLED` for a duplicate class; the UI
  shows blocking, specific copy and suggests upgrading/contacting an
  admin. Existing records are never blocked.
- **Academic structure `/portal/academics/*`** — CRUD for academic years
  (`isCurrent` is the API's call), programs, classes (program × year ×
  branch) and subjects, plus class-subject assignment. Deletes are
  confirmed; in-use records come back `*_IN_USE` (409) with the reason
  shown. Structure mutations are Owner/GM-only (backend 403; buttons
  hidden for branch managers as a convenience).
- **Timetable `/portal/academics/classes/[id]/timetable`** — weekly
  Mon–Sat grid; entry times are UTC wall-clock from the API and displayed
  in the org timezone (`Asia/Karachi`: 03:00 UTC → 08:00); the add-session
  form converts typed org-local times back to UTC. Empty state when
  nothing is configured.

## Staff, attendance & devices (Phase 6)

- **Staff directory `/portal/staff`** — TanStack-Query pagination with
  URL-driven search + branch/department/designation/status filters;
  Name · Staff ID · Branch · Department · Role(s) · Status · Actions.
  Skeleton / empty (“Invite staff”) / retryable error states; invited and
  pending-approval badges come from the API lifecycle.
- **Staff detail `/portal/staff/[id]`** — profile/contact, branches,
  department/designation, invitation state, activation status, and an
  API-provided attendance summary. Approve/reject, activate/deactivate
  (confirmed; self-deactivate disabled), role add/remove (owner/GM
  changes carry an impact warning; removing the last owner returns
  `LAST_OWNER`), branch add/remove. Role changes by unauthorized callers
  surface the backend 403 (“You are not allowed to change this user's
  role.”). Unknown staff → real 404; out-of-scope branch → permission
  state.
- **Student attendance `/portal/attendance`** — date + class selection,
  backend roster/day, batch marking (present/absent/late/excused only),
  mark-all-present, backend summary badges; the UI never presents
  locally-computed counts as final. Future dates are rejected by the API.
- **QR check-in `/portal/attendance/qr`** — start a session (joining code
  + 2h expiry), type/scan student codes, live-polled check-in list;
  duplicate scans return `ALREADY_CHECKED_IN`, unknown/off-roster codes a
  field error, expired sessions `QR_SESSION_EXPIRED`. QR check-ins write
  through to the same day record (`via qr`, time shown in org timezone).
- **Staff attendance `/portal/attendance/staff`** — first-in/last-out
  punches (API UTC → org timezone) and day statuses rendered **verbatim
  from the backend** (present/late/absent/on-leave/missing-punch + flags
  like “Late by 25 min”) — late/missing is never derived in the frontend.
- **Corrections & leave `/portal/attendance/requests`** — submit
  corrections (date, corrected in/out, reason) and leave (range, reason);
  managers approve/reject with confirmations; an approved leave flips the
  staff day to “On leave” server-side.
- **Devices `/portal/devices`** — backend device registry only: a device
  shows **Verified solely when the API says so** (with heartbeat); K50 /
  biometric units stay “Pending verification” / “Not configured” with
  “Never seen” until a real connector verifies them. Registrations always
  start `not_configured`; branch/mode mapping and removal are API
  mutations. Manual + QR attendance work fully without any device.
- All Phase 6 endpoints are provisional pending the canonical contract
  (**CR-008**); they plug into the same typed service seam
  (`services/staff|attendance|devices.ts`) and central error translator.

## Fees, student/parent portal, imports & settings (Phase 7)

- **Fees `/portal/fees/*`** — fee structures (program-targeted components,
  backend totals) with create/edit + voucher generation per period;
  vouchers directory (Student · Voucher ID · Due · Amount · Paid ·
  Balance · Status due/partial/overdue/settled) and voucher detail with
  component/discount breakdown and payment history. **Manual payments
  only**: record cash/bank/cheque receipts against a voucher — receipts
  are labeled “Manually recorded payment” and never mimic a gateway.
  Overpay/settled/future-date payments are backend-rejected. Overview
  reports (collections vs outstanding by branch) are API-computed; all
  money is API minor units in the **org's configured currency**.
- **Student & parent area `/student`** — separate shell, limited nav
  (Home, Attendance, Timetable, Fees, Notices, Results). Sign in as
  `guardian@demo.fluxeaze.test` (mock): linked students are resolved
  **from the backend session** (demo: Ayesha Khan + one sibling); every
  read re-checks the link (others → 403). Results show a published term
  or an honest “not yet available”. Staff sessions are pointed back to
  the org portal; guardians hitting `/portal` get a friendly refusal —
  no org metrics, no other students, no management tools, ever.
- **Imports `/portal/imports/*`** — students/staff/fees wizards:
  upload (CSV; Excel is a backend parse — the dev mock asks for CSV) →
  column→field mapping with sample preview → backend validation
  (per-row line numbers, errors/warnings, duplicates, downloadable error
  report) → explicit **Confirm & Import** with a final summary; jobs can
  be discarded. Commits run through the same backend rules as manual
  flows (capacity, duplicate invites, unknown student codes…).
- **Contextual help** — a “? Help” button on Dashboard, Students,
  Attendance, Fees and Imports opens the feature's article from the
  backend/config seam (`GET /help/articles/{featureId}`); unknown
  features get a minimal explanation instead of broken links, and no
  external doc/video URLs are ever fabricated.
- **Settings** — org profile (now incl. address), branches with
  code/location/status + confirmed disable, timezone & currency,
  academic year, **academic preferences** (grading scheme, backend late
  threshold), **roles & permissions** (backend catalog/matrix; Owner
  locked; removals warn + confirm), **security** (change password with
  server-side current-password check; session list + revoke one/others).
- All Phase 7 endpoints are provisional pending the canonical contract
  (**CR-009**), behind the same typed service seam + central error
  translator. Platform-admin pricing and any payment gateway remain
  Phase 8/deferred — the UI says so.

## Subscription, platform admin & deferred integrations (Phase 8)

- **Tenant billing `/portal/billing`** (owners + managers with billing
  access; branch managers get the backend's 403) — current plan with its
  **immutable version snapshot** (e.g. demo Sunrise runs on *Growth v2*
  while *v3* is published — publishing never silently changes a sold
  subscription), effective dates, per-resource allowances vs usage
  (students/GB/emails/credits — credits labeled as internal units, never
  money; WhatsApp/video rows truthfully “Not enabled”), renewal history,
  and published add-ons (Enabled/Available). **No checkout exists**:
  pilot activation is handled by Fluxeaze platform admins, with the
  API-provided support contact on the page.
- **Platform admin `/admin`** (sign in as `admin@fluxeaze.test` in the
  mock) — a visually distinct internal area gated by `/auth/me`'s
  platform-admin flag plus per-call backend 403s; tenant sessions get a
  restricted panel. Overview (catalogue health, supply pools, margins),
  **plan catalogue** with the full draft → preview → approve → publish
  lifecycle (clone or scratch drafts, USD base price, per-resource
  allowances, entitlements; preview shows impact vs the published
  version; publish retires the previous version and updates `/pricing`
  — the public page now renders *this catalogue's* published versions),
  **add-ons** (versioned, plan-linked), **resources & rates** (resource
  definitions, provider rates, supply pools, margin warnings —
  **admin-only, never present in tenant payloads**), **enterprise
  quotes** (quote rules; draft → sent → accepted → convert, conversion
  activates the quoted snapshot verbatim) and a filterable **audit
  history** (who/what/when).
- **Deferred integrations** — Settings → Integrations renders
  backend flags for WhatsApp, video classes, both payment gateways,
  payroll, unsupported biometrics and native apps: all “Not enabled” /
  “Coming soon” with explanations and **no fake controls**.
- All Phase 8 endpoints are provisional pending the canonical contract
  (**CR-010**) behind the same service seam; subscription DTOs contain
  no cost data by construction.

## Tests

- **Unit/component (Vitest, 157 tests):** Phases 1–7 coverage plus
  Phase 8 — subscription snapshot/usage (live student counts, credits vs
  money, deferred resources), billing 403 for branch managers,
  platform-admin gate (401/403), published-only public projection, the
  full version lifecycle (publish retires the old version, pricing
  follows, **sold snapshots untouched**), not-draft/state-conflict
  rejections, add-on publishing, quote conversion activating an org,
  audit emission + filters, pool/margin warning levels, and deferred
  integrations never reporting “enabled”.
- **E2E (Playwright, 47 tests, mock transport):** everything through
  Phase 7 plus Phase 8 — billing snapshot + pilot message + *no*
  pay/checkout affordance + branch-manager restriction; admin
  clone→edit→preview→approve→publish with `/pricing` updating to the new
  price; quote conversion making the subscription visible in tenant
  billing; tenant sessions blocked from `/admin`. Earlier suites cover
  the remaining mandated journeys (auth/session expiry, org switch,
  invite approval/activation, role/branch 403s, BM dashboard scoping,
  duplicate/transfer, QR duplicate handling, device “not configured”,
  manual fee receipts, import validation+commit, 80/90/100% capacity
  states, pricing no-plan honesty, error+retry with input preserved) —
  the journey-by-journey map is in BACKEND_INTEGRATION_REPORT.md §14.

## Deviations from the original phase brief (deliberate)

1. **`lint` is `eslint .`, not `next lint`.** Next.js 16 removed `next lint`;
   linting now runs through the ESLint CLI with a flat config
   (`apps/frontend/eslint.config.mjs`) using `eslint-config-next`
   core-web-vitals + TypeScript presets.
2. **Placeholder contract instead of a canonical one.** No backend contract
   existed in the workspace. Rather than inventing endpoints (forbidden), a
   zero-endpoint placeholder verifies the pipeline; API-dependent work is
   tracked as blocked in the integration report.
3. **`api:check` uses checksum + regeneration diff, not timestamps.**
   Timestamps are unreliable under git checkouts/CI; content comparison is
   deterministic.
4. **Route-group placeholders use distinct paths (`/portal`, `/student`,
   `/admin`).** App Router groups add no URL segment, so four group-level
   `page.tsx` files would all claim `/` and conflict. Only `(public)` owns
   `/`; later phases route signed-in users to their area after auth.

## What comes next

The MVP frontend is feature-complete. Remaining work is integration, not
features (see [PROJECT_AUDIT.md](./PROJECT_AUDIT.md) for the full scorecard):

1. **Publish the canonical `openapi.yaml`** (CR-001…CR-010 in
   [BACKEND_INTEGRATION_REPORT.md](./BACKEND_INTEGRATION_REPORT.md) list
   every assumed endpoint/shape). Then: `npm run api:types`, update
   `contracts/CONTRACT_VERSION.txt`, implement the `contract` branches of
   the service adapters, and re-run the full gate (`lint`, `typecheck`,
   `test`, `e2e`, `build`, `api:check`) against a live backend — no UI
   rewrites, by design.
2. **Deferred integrations, when the backend enables them** — WhatsApp,
   video classes, subscription & fee payment gateways, payroll,
   additional biometrics, native mobile apps. The UI already renders
   their truthful not-enabled states from API flags.
3. Production hardening with real data: contract-mode E2E against a
   staging backend, performance budgets, and analytics/consent wiring
   behind the existing seams.
