> **OBSOLETE — 2026-04-24.** Phase 6 was re-framed by the build owner as
> "design delivery" rather than "design implementation." The canonical
> output of Phase 6 is now the **Arcadia Design System** folder delivered
> as a ZIP (`/Users/aria/Downloads/Claude Design - Arcadia/`), which
> contains ui-kit JSX prototypes, token CSS, SVG assets, and individual
> preview HTMLs for every design primitive. Wiring those designs into
> the production app is now **Phase 8** — see `phase-08_plan.md` once
> written. This file is kept for history only; do not execute it.

## Phase 6 Plan: Scriptorium UI — doorway, host, hub (OBSOLETE — see Phase 8)

**Source:** Post-MVP. The MVP phase plan (`docs/mvp/phase-plan.md`) ends at Phase 5. Phase 6 applies the v4.5 "midnight scriptorium" design direction — now the source of truth in `/design/` per ADR 0009 — to the three React surfaces whose HTML mockups were delivered 2026-04-23. `/design/CLAUDE.md` is binding for all work in this phase.

**Goal:** Wire the scriptorium design system into `/apps/web` and redesign three surfaces so they match `reference/02-login.html`, `reference/03-creator-dashboard.html`, `reference/04-member-dashboard.html` under real data and real auth. Existing server actions, Supabase queries, RLS policies, and Colyseus wiring are untouched — Phase 6 is a skin-and-compose pass, not a logic pass.

**Structure: three sub-phases shipped independently.** Each sub-phase ends with its own `/review`, `/security-review` (where applicable), and a `design/reviews/YYYY-MM-DD_<surface>.md` entry. Sub-phases MUST land in order — 6.1 establishes the shared token wiring and the first primitive components that 6.2 and 6.3 both reuse.

- **6.1 — doorway.** `/login` + `/signup` + `/onboarding/avatar`. First surface; includes foundation (tokens + fonts + Tailwind extension + shared primitives).
- **6.2 — host.** `/dashboard` + `/dashboard/courses/[id]` + `/dashboard/courses/[id]/analytics`. Highest-risk sub-phase (existing CRUD must keep working).
- **6.3 — hub.** New route `/hub`. Post-login landing; entry points into `/world`, `/academy`, `/market`, `/tavern`.

**Out of scope (Phase 6 explicit):**
- **Real OAuth providers.** The `02-login.html` mockup shows Google + GitHub buttons. They render in 6.1 as disabled "another door — not yet open" affordances. Wiring real providers requires Supabase dashboard config + callback routes + a separate ADR; defer to a dedicated post-6 phase.
- **Phaser scene redesigns.** `apps/web/components/game/scenes/**` is governed by per-scene CLAUDE.md and ADR 0004. Phase 6 does not touch game rendering.
- **New server actions, migrations, or RLS changes.** Any Phase-6 step that tries to introduce one is a scope violation — pause and reopen the plan.
- **Mobile layout tuning beyond the breakpoints baked into the HTML mockups.** The mockups ship with `@media (max-width: 900px)` rules; we port those as-is. Deeper mobile work lands in a later phase.
- **API reference docs, changelog entries for un-shipped surfaces, creator guides.** Changelog entry at sub-phase exit only.
- **Wiring of `/academy/[courseId]`, Market `StallView`, or Tavern surfaces to the scriptorium.** Their `design/areas/*.md` starters exist but their HTML mockups do not. Separate phase once mockups land.

---

### Pre-plan decisions — locked (approved 2026-04-23)

| # | Decision | Value | Why |
|---|----------|-------|-----|
| A | Sub-phase structure | 6.1 doorway → 6.2 host → 6.3 hub | Lowest blast radius; each ships with its own review + status log; one sub-phase can revert without rolling back the others. |
| B | OAuth scope | Buttons render **disabled** with a hand-written "not yet open" tooltip. No `signInWithOAuth` calls. | Wiring real OAuth needs Supabase dashboard config + redirect URIs + a callback route + an ADR. Not in scope. Keep the design-visual promise without the backend surface area. |
| C | Hub route | **New route `/hub`.** After login, router pushes to `/hub` (replacing today's push to `/` or `next=`). Middleware protects `/hub/*`. Root `/` keeps current behavior (unauthenticated landing / redirect-to-login). Authenticated users who hit `/` redirect to `/hub`. | The "back to the hub" link in `02-login.html` and the voice in `04-member-dashboard.html` imply a dedicated member-landing surface. `/world` stays the Phaser world entry, reachable from `/hub`. |
| D | `/signup` + `/onboarding/avatar` | Redesigned in 6.1 alongside `/login`. | Visual continuity across the entry funnel; users flow login → signup → onboarding → hub on first use. A skinned login landing on an unskinned signup would be jarring. |
| E | Token wiring | Step 1 of 6.1 (not a standalone 6.0). | One `globals.css` edit + one `layout.tsx` font batch + one `tailwind.config.ts` extension. ~30–60 min. Nothing else can happen without it. |
| F | Area-file workflow | Before each sub-phase: write / promote `/design/areas/<surface>.md` from starter to committed direction. Binding per `design/CLAUDE.md`. | The starter area files flag open questions; those become commitments before code is written. Failure to do this step early is the most common way a scriptorium design drifts into AI-slop under pressure. |
| G | ADRs | One ADR (0010) recording the token-wiring technique (CSS vars in `globals.css` + `next/font` + `tailwind.config.ts` extend). Opens with sub-phase 6.1 step 2. **No** ADR yet for OAuth (out of scope). | The token-wiring choice is a durable architectural decision — future sub-phases depend on the specific plumbing. Worth one record. |

---

### Shared primitives built in 6.1 (used by 6.2 + 6.3)

Living at `apps/web/components/design/` (new directory). All TS/TSX. All styled against the CSS custom properties wired in step 2.

- `<NightRoom>` — the page-level container. Dark vignette + radial lantern pool above the desk. Includes the hanging-lantern rig with the 6 s sway animation.
- `<Desk>` — the stained-oak surface with bronze corner bosses. Children compose inside.
- `<TagNav>` — the vellum-tag top nav (hub / doorway / host / the kit).
- `<ScrollCard>` / `<VellumCard>` / `<LedgerCard>` / `<EnvelopeCard>` / `<JournalCard>` / `<MapCard>` — the six surface primitives from `/design/system/surfaces.md`. Each accepts a `rotate?: number` prop (default randomized within the primitive's allowed range from `motion.md`).
- `<WaxSeal>` — the tilted oxblood badge; `letter` prop.
- `<DropCap>` — the illuminated letterform; `variant?: 'blue' | 'wax' | 'verdigris'` + `letter`.
- `<Kicker>`, `<Byline>`, `<ScribeDivider>` — typography primitives.
- `<Brand>` — the 60 px bronze medallion + "Arcadia" wordmark + optional tagline.

**Naming + testing per existing conventions:** PascalCase component files, tests colocated, TypeScript strict, no business logic inside these (purely presentational).

---

## Sub-phase 6.1 — doorway

**Scope:** `/login`, `/signup`, `/onboarding/avatar`. Foundation wiring. Shared primitives built here.

**Reads first:**
- `/design/CLAUDE.md` (binding)
- `/design/reference/2026-04-23_v4.5-scriptorium-01-design-system.html` (the kit)
- `/design/reference/2026-04-23_v4.5-scriptorium-02-login.html` (the doorway — copy from the outputs folder in step 0)
- `/design/system/*` (all six files)
- Existing `/apps/web/app/login/page.tsx`, `/apps/web/app/signup/*`, `/apps/web/app/onboarding/avatar/*`
- `apps/web/lib/supabase/client.ts` + `server.ts`, `apps/web/middleware.ts` (to know what to leave alone)

### Steps

0. **Copy the remaining mockups into `/design/reference/`** (one-time, applies across sub-phases): `02-login.html`, `03-creator-dashboard.html`, `04-member-dashboard.html`. Rename to the dated convention (`2026-04-23_v4.5-scriptorium-NN_<name>.html`).
1. **Commit `design/areas/doorway.md`** — new area file covering login + signup + onboarding. Start from the voice, surfaces, and copy patterns in the 02-login HTML. Resolve the open questions the starter flagged; lock every decision a later step would otherwise re-litigate (two-column vs stacked, scroll vs vellum for the form, disabled-OAuth copy, onboarding-avatar surface, error-state voice). **Stop and wait for user approval** before step 2.
2. **Token wiring + ADR 0010.** Add the `:root { --night: ...; ... }` CSS custom-property block from `design/reference/01-design-system.html` to `apps/web/app/globals.css`. Import the six Google Fonts via `next/font` in `apps/web/app/layout.tsx`; bind each to its `--font-*` custom property. Extend `apps/web/tailwind.config.ts` with the palette + `fontFamily` tokens so utilities like `bg-vellum`, `text-ink`, `font-display` resolve correctly. Open `planning/decisions/0010_2026-04-23_design-token-wiring.md` with the technique + rationale + rollback path.
3. **Build the shared primitives** at `apps/web/components/design/*.tsx` — the eight-component set listed above. One file per primitive. Unit tests colocated. No business logic, no data fetching. Each primitive has a Storybook-free visual check approach documented in its header comment (since we don't have Storybook installed — visual check is via an ad-hoc route or Chrome MCP).
4. **Reskin `/login`.** Replace the current Tailwind form with the two-column doorway composition: `<NightRoom>` → `<Desk>` → left `<NightScene>` (moon + cottage + fireflies + stars animations from the HTML) + right `<ScrollCard>` containing the login form. Keep `signInWithPassword` exactly as today. Keep `next=` param. Keep `router.push(next)` + `router.refresh()`. Disabled OAuth buttons for Google + GitHub with a hand-written Caveat tooltip. Error states in `--oxblood`, NOT red-400.
5. **Reskin `/signup`.** Same two-column layout, different scroll copy ("ask the doorkeeper for a key"). Existing Supabase sign-up logic unchanged. Link from the login form's "first time here?" line.
6. **Reskin `/onboarding/avatar`.** Single-column `<VellumCard>` picker; avatars displayed as tiles on the vellum (bronze-studded). Existing avatar-selection logic untouched. Post-selection redirect to `/hub` (note: redirect target changes in 6.3; for 6.1 keep whatever it is today, flag in status log).
7. **Chrome visual verify.** Using Claude in Chrome MCP, open `/login` in dev and diff against `02-login.html` opened side by side. Capture screenshots. List any aesthetic gaps > 3 pixels or > 5% color delta; fix the blocking ones. Non-blocking gaps go into the 6.1 review.
8. **`/security-review`.** MANDATORY per root CLAUDE.md — we edited auth surface files. Flag any new XSS/CSRF/redirect-injection/token-leak surface introduced by the skin. If clean, note so in the status.
9. **`/review`.** PR-style review of the diff.
10. **`design/reviews/2026-04-DD_doorway.md`.** Post-ship review — what worked, what didn't, what to fold back into `system/`. Append to `design/areas/doorway.md` a dated note describing what shipped.

### 6.1 exit criteria

1. `/login`, `/signup`, `/onboarding/avatar` all render on `localhost:3000` against the scriptorium design — no Tailwind neutral-800 strays, no Inter/system-ui fallbacks visible.
2. `signInWithPassword` round-trip works end-to-end (existing E2E + a manual login with a test account).
3. Unauthenticated user visiting `/dashboard` or `/hub` is redirected to `/login` (middleware behavior preserved).
4. Six Google Fonts load from `next/font` with no layout-shift flash; verify in DevTools (no FOIT longer than 100 ms on a 3G throttle).
5. Tailwind utilities for the new tokens compile (`bg-vellum`, `font-display`, `text-lantern`) — verified by using at least one utility of each group in the reskinned surfaces.
6. `/security-review` returns no high-severity findings.
7. `design/reviews/2026-04-DD_doorway.md` written.
8. ADR 0010 merged.

---

## Sub-phase 6.2 — host

**Scope:** `/dashboard`, `/dashboard/courses/[id]`, `/dashboard/courses/[id]/analytics`. Full creator-surface reskin using the primitives from 6.1 and the ledger/journal/envelope emphasis from `03-creator-dashboard.html`.

**Reads first:**
- `/design/CLAUDE.md`
- `/design/reference/2026-04-23_v4.5-scriptorium-03-creator-dashboard.html`
- `/design/areas/dashboard.md` (starter — promote to committed in step 1)
- `/design/areas/analytics.md` (starter — promote to committed in step 1)
- Existing `/apps/web/app/dashboard/**` (server actions, validators, `_components/`, `__tests__/`)

### Steps

1. **Promote `design/areas/dashboard.md`** from starter to committed direction against `03-creator-dashboard.html`. Close every "commit during first design pass" question. Same for `design/areas/analytics.md` if the mockup carries analytics direction (check the HTML first). **Stop and wait for user approval** before step 2.
2. **Shell reskin** — `apps/web/app/dashboard/page.tsx` wrapped in `<NightRoom>` + `<Desk>` + `<TagNav>` with "host" active. Brand + page-head with dropcap + kicker + scrawl as in the HTML.
3. **Course list reskin** — each course rendered inside a `<LedgerCard>` row. Wax seal for published, iron nail (decorative) for draft. Existing data (`fetchCourses()` or equivalent) unchanged; only the TSX layout changes.
4. **Course detail reskin** — `/dashboard/courses/[id]/page.tsx`. Course header in a `<ScrollCard>`. Section/lesson rows in a nested `<LedgerCard>` per section. Server actions (`actions.ts`) untouched.
5. **Publish / unpublish / save-draft affordances** — wax "seal it" button + ghost "set aside" button, replacing current Tailwind button styles. No behavior change.
6. **Stats strip reskin** — a row of small `<EnvelopeCard>`s at the top of `/dashboard` showing the key numbers already pulled by the existing server component. If a KPI isn't already fetched, skip it (no new data work in this phase).
7. **Analytics page reskin** — `/dashboard/courses/[id]/analytics/page.tsx`. Main chart panel on `<JournalCard>` with hand-drawn SVG ink lines (see `design/areas/analytics.md` data-viz rules: no Recharts, line charts only, colors from `--wax` / `--ink-blue` / `--verdigris`). Ledger-card for per-lesson table. Existing `fetch.ts` + `aggregate.ts` untouched.
8. **Empty / error / loading states.** Empty dashboard (no courses) uses the "no courses yet. light the lantern and write the first." copy. Errors in `--oxblood`, not red. Loading: single Caveat "~ counting ~" line per `analytics.md`.
9. **Chrome visual verify** vs `03-creator-dashboard.html`. Diff all three sub-routes. Fix blocking gaps.
10. **`/review`** — review the diff against existing server actions (they must not have changed).
11. **`design/reviews/2026-04-DD_host.md`** + dated note on `design/areas/dashboard.md` and `analytics.md`.

### 6.2 exit criteria

1. Creator can still list courses, open a course, edit sections/lessons, publish/unpublish, view analytics — full CRUD round-trip unchanged from Phase 5.
2. Zero changes to `actions.ts`, `validation.ts`, `fetch.ts`, `aggregate.ts`, or any migration.
3. Course-builder E2E passes on CI (existing test suite, no new tests required in this phase — visual regression is manual).
4. Analytics page renders hand-drawn SVG ink line chart against real data. No Recharts or similar library introduced (check `package.json` diff).
5. `design/reviews/2026-04-DD_host.md` written; `areas/dashboard.md` + `areas/analytics.md` promoted from starter → committed.

---

## Sub-phase 6.3 — hub

**Scope:** New route `/hub`. Post-login landing. Entry points into world / academy / market / tavern.

**Reads first:**
- `/design/CLAUDE.md`
- `/design/reference/2026-04-23_v4.5-scriptorium-04-member-dashboard.html`
- Existing `apps/web/app/layout.tsx`, `apps/web/middleware.ts`, `apps/web/app/login/page.tsx` (where the post-login push lives)
- Existing world / academy / market / tavern routes (we don't touch them; we just need the URLs)

### Steps

1. **Write `design/areas/hub.md`** — new area file committed from `04-member-dashboard.html`. Define the surface mix (likely: map-card entry grid for world/academy/market/tavern, journal-card for progress, envelope-cards for XP/level KPIs from Phase 5, vellum-card for activity feed). **Stop and wait for user approval** before step 2.
2. **Create `/hub` route.** `apps/web/app/hub/page.tsx` (server component by default). Session-gated via middleware (middleware already protects `/dashboard` — extend the matcher). Fetch the member's memberships, XP, level, recent activity.
3. **Hub layout.** `<NightRoom>` → `<Desk>` → `<TagNav>` ("hub" active) → page head with dropcap → grid of map-cards / envelope-cards / journal-card / vellum-card per the area file's commitments.
4. **Entry-point cards** — map-card per destination (world / academy / market / tavern). Clicking routes the member into the existing surface. No changes to those surfaces; the hub is an entry point, not a wrapper.
5. **XP / level KPI strip** — envelope-cards reading the live `memberships.xp` + `level`. Respects the Phase-5 `useLevelSync` flow (updates here after a lesson-complete). The hub becomes a fourth mount point for `useLevelSync` if we want level-up banners to fire here too — decide in the area file.
6. **Post-login redirect.** Update `/login/page.tsx` and `/signup/page.tsx` to push to `/hub` on success instead of `/` or `next=`. Update `/onboarding/avatar` post-selection redirect from whatever-it-is-today → `/hub`.
7. **Authenticated root redirect.** Middleware: if authenticated + `pathname === '/'`, redirect to `/hub`. Unauthenticated `/` continues to behave as today.
8. **Chrome visual verify** vs `04-member-dashboard.html`. Navigate login → hub → click a tag → land in world → back button → hub. Confirm the transitions feel intentional (the lantern should feel continuous across routes; if it doesn't, note a future polish item).
9. **`/security-review`** — we edited middleware.ts and the login/signup push. Flag any session-loss or open-redirect risk.
10. **`/review`**.
11. **`design/reviews/2026-04-DD_hub.md`** + dated note on `design/areas/hub.md`.
12. **Changelog entry** `docs/changelog/2026-04-DD_scriptorium-ui.md` — one entry covering all three sub-phases, user-facing summary.

### 6.3 exit criteria

1. `/hub` renders at dev + deployed preview, gated by middleware.
2. Login + signup + onboarding all push to `/hub` on completion. Root `/` redirects to `/hub` when authenticated.
3. Member sees their XP, level, and entry points to world / academy / market / tavern. Clicking a map-card navigates to the existing route.
4. Phase-5 level-up banner still fires on lesson-complete when the member is on `/hub` (if we wired `useLevelSync` per the area-file decision).
5. `/security-review` clean on the middleware diff.
6. Changelog entry merged.
7. All three `design/areas/*.md` files (doorway, dashboard, analytics, hub) in committed state. All three `design/reviews/*.md` written.

---

### Phase 6 global test criteria (checked at end of 6.3)

1. **Aesthetic continuity.** A user walking login → signup → onboarding → hub → dashboard → analytics never sees a Tailwind-neutral-800 stray, an Inter fallback, or a flat white card. Visual consistency with the four reference HTML files holds.
2. **No regression in shipped behavior.** Course CRUD, XP/level loop, Phaser scenes, Colyseus rooms, RLS — all unchanged from Phase 5. Existing E2E passes. Demo-cut from Phase 5 still runs.
3. **Design workspace is consistent with what shipped.** `design/areas/*.md` match the rendered surfaces; `design/reviews/*.md` exist for each; `design/system/*.md` is unchanged (this phase did not add new system primitives) OR the delta is documented.
4. **Performance budget.** First-contentful-paint on `/login` and `/hub` within 10% of pre-phase-6 baseline. Font loading via `next/font` does not regress LCP. Verify via Vercel preview Lighthouse on each surface.
5. **Bundle size.** New primitives (`apps/web/components/design/*`) add no more than ~15 KB gzipped to the client bundle. Measured via `next build` output diff.

---

### Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tailwind extension + next/font + CSS-vars collide (utility class produces a different color than the token at runtime) | Medium | Cover the most-used utilities in step 3 of 6.1 (one primitive per token group). If a utility renders wrong, it fails visibly during primitive dev, not production. |
| Six Google Fonts cause FOIT / CLS on slow connections | Medium-Low | `next/font` does preload + subset by default. Verify on 3G throttle in 6.1 exit step. If it's bad, cut Cormorant Garamond (the backup display — rarely used). |
| `/hub` becomes a second dashboard and creeps in scope | Medium | 6.3 exit criterion #3 caps the hub's scope to entry points + XP/level KPIs + activity feed. Anything else is a follow-up phase. |
| Skinning `/dashboard` breaks a server action or form submission silently | Low (skin-only changes) | Exit criterion 6.2 #1 is a full CRUD round-trip; if it breaks we catch before merge. |
| Middleware change for authenticated-root redirect introduces a redirect loop | Low-Medium | Explicit test in 6.3 step 7: authenticated user visiting `/` must land on `/hub` in exactly one redirect; anonymous `/` must stay put. Manual verify + add a quick integration test if time permits. |
| OAuth buttons render as disabled but a tester clicks expecting to be redirected somewhere | Low | Caveat tooltip + `cursor-not-allowed` + no click handler. The tooltip copy is committed in the `areas/doorway.md` file. |

---

### Naming + commits

- Branch: `phase-06_scriptorium-ui` (single branch; sub-phase commits prefixed `6.1:`, `6.2:`, `6.3:`).
- Each sub-phase ends with a PR titled `phase-06.N: <surface>`.
- Phase-status logs: `phase-06_status.md` — one file; sub-phase entries newest-on-top matching phase-05 style.
- Changelog: one entry at the end of 6.3 (`docs/changelog/2026-04-DD_scriptorium-ui.md`).
