# Fluxeaze Design System (Phase 2)

Live showcase: **`/design-system`** (run `npm run dev`). Tokens live in
`src/app/globals.css`; primitives in `src/components/ui/`; data-state
components in `src/components/feedback/`. If it renders wrong anywhere, it
should render wrong on the showcase first — check there before debugging pages.

## Tokens

All tokens are CSS variables. Tailwind CSS 4 utilities map onto them via the
`@theme inline` block, so `bg-primary`, `rounded-md`, `shadow-md`, `p-4`,
`text-h1` etc. resolve through variables. **Never hardcode hex/px in
components** — add or reuse a token.

| Group | Variables | Tailwind usage |
|---|---|---|
| Colour | `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-primary` (+`-hover`, `-foreground`), `--color-secondary` (+`-hover`, `-foreground`), `--color-border`, `--color-text`, `--color-muted`, `--color-error/-warning/-success/-info` (each with `-surface`), `--color-overlay` | `bg-surface`, `text-muted`, `border-border`, `bg-error-surface` … |
| Spacing | `--space-1…16` (0.25rem step) | `p-4`, `gap-3`, `mt-8` … |
| Radii | `--radius-sm/md/lg/full` | `rounded-md`, `rounded-lg` … |
| Shadows | `--shadow-sm/md/lg` | `shadow-sm`, `shadow-md` … |
| Focus | `--focus-ring` | Global `:focus-visible` outline (automatic) |
| Type | `--font-size-h1…h6/body/sm/caption` + `--line-height-*` | `text-h1…text-h6`, `text-body`, `text-caption`; bare `h1–h6` elements are pre-styled |

**Theming:** light is default; `[data-theme="dark"]` on `<html>` overrides
colour/shadow/focus values only. `ThemeProvider` + `ThemeToggle`
(`src/components/theme/theme.tsx`) persist the choice in `localStorage`
(key `fluxeaze-theme`) — the **only** sanctioned use of web storage;
sessions/tokens must never go there. A pre-paint script in the root layout
prevents theme flash.

## Components (`src/components/ui/`)

Import from `@/components/ui` (barrel) or the specific file.

- **Button** — `variant: primary | secondary | subtle | destructive`,
  `size: sm | md | lg`, `isLoading` (spinner + `aria-busy` + disabled).
  Defaults `type="button"`. Destructive/financial actions pair with
  `ConfirmDialog`, never fire immediately.
- **Input / Select / Textarea / Checkbox / Radio** — native controls.
  `invalid` sets error border + `aria-invalid`. Group radios in
  `<fieldset>/<legend>`; checkboxes/radios sit inside their `<label>`.
- **FormField + Label** — always wrap controls: it generates the id, links
  `label ↔ control`, merges `aria-describedby` (description + error), sets
  `aria-invalid`, announces errors (`role="alert"`) and marks required
  fields accessibly. Forms can't forget the plumbing.
- **Card** (+ `CardHeader/Body/Footer/Title/Description`) — surface container.
- **Badge** — `default | success | warning | error | info`. Colour is never
  the only signal: always clear text (“Not configured”, “Pending verification”).
- **Table** family — semantic `<table>` in a labelled horizontal-scroll
  region (`aria-label` on `Table`). `TableHead` defaults `scope="col"`.
  On very small screens prefer card layouts where the Team says better.
- **Dialog / Modal** — `role="dialog"`, `aria-modal`, labelled by heading,
  focus-trapped, ESC + backdrop dismissal, focus restored on close, scroll
  locked. **ConfirmDialog** is the required pattern for destructive,
  financial and publishing/approval actions.
- **Toast** — `ToastProvider` (mounted in root `Providers`) + `useToast()`.
  Single polite live region; max 5 queued; `duration: 0` = sticky.
  Variants: `success | error | warning | info`.
- **Skeleton / Spinner** — loading placeholders (decorative; announce via a
  surrounding `role="status"`).

## Data states (`src/components/feedback/`) — mandatory per screen

Every data screen implements: **loading** (`PageLoading`/`Skeleton`),
**success**, **empty** (`EmptyState` with a next step), **validation error**
(`FormField` errors), **403 / network / server error** (`ErrorState` with
retry + request ID). ErrorState consumes `normalizeApiError` from
`src/api/errors.ts`, which maps HTTP statuses to friendly copy and always
preserves `requestId`. Until the canonical contract publishes its error
envelope, extraction is defensive (status/code/message/requestId) — align
keys there, never per-feature.

## Layouts & route groups

| Group | Layout | Placeholder route |
|---|---|---|
| `(public)` | marketing header/footer | `/` (+ `/pricing`, `/request-pilot`, `/auth/sign-in` placeholders) |
| `(portal)` | `PortalShell`: top bar + side nav → mobile drawer | `/portal`, `/design-system` |
| `(student)` | simplified, linked-student-only chrome | `/student` |
| `(admin)` | distinct platform-admin chrome | `/admin` |

Note: route groups don't add URL segments, so each group exposes a distinct
placeholder path (`/portal`, `/student`, `/admin`) instead of four
conflicting `/` pages. Disabled future nav items render as
`aria-disabled` “Soon” — no dead controls, no fake data.

## Adding a new component (checklist)

1. Tokens only — colours/spacing/radii/shadows/type via utilities above.
2. Semantics first: real elements (`button`, `nav`, `table`…), labels/ARIA
   wired, keyboard operable, visible focus, ≥ 4.5:1 text contrast in **both**
   themes.
3. States: default / hover / focus-visible / disabled / loading / error —
   as applicable; respect `prefers-reduced-motion` (global CSS handles it).
4. `className` prop appended last via `cn()` (`@/lib/utils`) so callers extend.
5. Add it to the `/design-system` showcase and a Vitest test next to it
   (`__tests__/`), then export from the barrel file.
6. Client components get `"use client"` only when they truly need it.

## Providers (`src/app/providers.tsx`)

Mounted once in the root layout for all groups: TanStack Query (server
state; conservative retries), `ThemeProvider`, `ToastProvider`.
