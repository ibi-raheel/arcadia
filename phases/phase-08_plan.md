## Phase 8 Plan: UI wire-up — production React against the delivered design system

**Source:** Post-MVP. Phase 6 delivered the **Arcadia Design System** package (`/Users/aria/Downloads/Claude Design - Arcadia/`) — a refinement of the v4.5 midnight scriptorium with token CSS, SVG assets, 20 primitive preview HTMLs, and JSX prototypes for 5 product surfaces (dashboard / academy / market / tavern / tent). Phase 8 is the production wire-up: token integration, shared primitives as TSX components, per-surface rebuilds against real Supabase data, and a **simulation toggle** so any data-backed screen can swap to fixtures on demand.

**Goal:** Every data-fetching surface in `/apps/web` renders on the midnight-scriptorium design system, reads from Supabase + Colyseus by default, and flips to hand-authored mock fixtures when the simulation toggle is on.

**Branch:** `phase-08_ui-wireup` (already created; cleanup preamble committed in `c829554`).

**Relationship to prior phases:**
- **Phase 7** (gameplay polish on Phaser scenes) — merged to main as of `1d87d92` and `#12`. Unaffected by Phase 8.
- **Phase 6** (re-framed as "design delivery") — complete. Output is the Downloads zip; `phase-06_plan.md` is marked obsolete.
- **Phase 5** (gamification) — live on main. Phase 8 will visually re-skin the dashboards but not touch the XP / level / enrolment logic.

**Out of scope (Phase 8 explicit):**
- **New Supabase schema / migrations / RLS changes.** If a Phase 8 surface needs a field that doesn't exist yet (e.g. `memberships.mrr`), the plan flags it as a data gap — the surface reads a default or a mock, and the schema change becomes a separate follow-up.
- **Real OAuth / SSO providers.** Login is re-skinned but stays email+password. OAuth is a separate ADR.
- **Phaser scene aesthetics.** Scene art stays as-is (it's not React; the design system governs React surfaces only).
- **Background music.** Still deferred from Phase 7.
- **Mobile-first layouts beyond what the UI kits already provide.** Desktop is the priority.
- **New SEO / marketing pages.** Only authenticated, data-backed surfaces.

**Constraint:** Another Claude session may begin working on main in parallel. Phase 8 stays on its own branch until merge, same as Phase 7.

---

### Pre-plan decisions — NEEDS USER CONFIRMATION

| # | Decision | Recommendation | Why |
|---|----------|----------------|-----|
| A | **Where do the downloaded design files live in the repo?** | Copy the minimum needed into the repo under `design/kit/`: `colors_and_type.css`, `assets/*.svg`, the 5 `ui_kits/*/index.html` as read-only references. The full Downloads folder stays on the build owner's disk as the source of truth; we pick what we need. | Keeps the repo lean (don't commit 20 preview HTMLs), gives us versioned tokens + assets, and doesn't duplicate the JSX prototypes we're about to rewrite as TSX. |
| B | **Token wiring technique** | (a) CSS custom properties: paste the `:root {...}` block from `colors_and_type.css` into `apps/web/app/globals.css`. (b) Fonts: import the 6 Google Fonts via `next/font` in `apps/web/app/layout.tsx` and bind each to its `--font-*` var. (c) Tailwind: extend `tailwind.config.ts` with the palette (`bg-vellum`, `text-ink`, etc.) + `fontFamily` keys. All three — pick one only if you want a smaller footprint. | Matches ADR 0010 (token-wiring technique) from the earlier Phase 6 plan (which was obsoleted but this decision carries forward). |
| C | **Charts — library or hand-roll?** | **Hand-roll SVG**, per `/design/areas/analytics.md` rule "No default chart libraries. Recharts, Chart.js, Nivo — skip." The scriptorium aesthetic depends on hand-drawn ink lines on the journal grid; any chart lib would fight the style. | Dashboard has revenue sparklines, subscriber funnels, ROI bars. 200-400 lines of SVG-drawing utilities in `lib/charts/*.ts` should cover it. Re-evaluate if the utilities balloon past ~500 lines. |
| D | **Simulation-mode persistence** | Hybrid — **localStorage source of truth + URL param `?sim=1` overrides**. In-app **visible indicator** (lantern-coloured pill, top-right) whenever sim is on. | Sticky for developer/demo use (localStorage), shareable for demo links (URL param), visible so real data doesn't get confused with mock. |
| E | **Simulation surface coverage** | Every data-fetching surface: creator dashboard + all its tabs, member hub, academy viewer, market catalogue + StallView, creator analytics, leaderboard. | User request: "everywhere that fetches data." |
| F | **Dashboard tab structure** | Full tab set from the kit: `studio` / `courses` / `memberships` / `audience` / `payouts` / `settings`. New routes for the four that don't exist yet (`/dashboard/memberships`, `/audience`, `/payouts`, `/settings`) land as shell-only ("coming soon") in Phase 8 foundation, with data wire-up in subsequent commits only for the ones with existing Supabase data. | The kit assumes these tabs exist; a partial shell is misleading. Shells are cheap; data wiring is the real work. |
| G | **Member Hub route** | **New route at `/hub`.** Post-login redirect there. The old "Phase 6 hub" plan already picked this; carry it forward. Middleware extends its protected matcher. | Carried-forward decision from the obsolete `phase-06_plan.md` — which the build owner implicitly approved by continuing to reference the "hub" as a surface in the Downloads kit. |
| H | **Fate of the in-progress `app/doorway/`, `/host/`, `/hub/`, `/kit/` dirs from other session** | **Already discarded** in the preamble commit. Phase 8 rebuilds `/doorway` (login), `/host` (creator-studio shell), `/hub` (member-home), `/kit` (visible design-system tab) from scratch against the Downloads kit. | User call in 2026-04-24 conversation: "discard." |
| I | **Fixture data layout** | `apps/web/lib/fixtures/<surface>.ts` per surface, each exporting a default fixture that matches the production data shape exactly (same TypeScript types as the server-side fetchers). One shared `useFetchOrMock(realFetcher, mockFixture)` hook / HOF wraps every data source. | Keeps fixtures near the real fetchers, makes them strictly type-compatible, gives a single swap point for the toggle. |

---

### Locked decisions (Phase 8) — filled once user confirms A-I

*Populate this table after user approves A–I.*

---

### Sub-phase 8.0 — Foundation (tokens + primitives + simulation scaffold)

**Scope:** Everything needed before any specific surface is rebuilt.

**Reads first:** Downloads folder — `README.md`, `colors_and_type.css`, `assets/*`, `preview/*.html`, `ui_kits/*/index.html` (as visual references). `/design/CLAUDE.md`. `/design/system/*.md`. `/design/reference/*.html`.

**Steps:**

1. **Copy minimum assets into `design/kit/`** (new subdir) — `colors_and_type.css`, `assets/*.svg`, and one `index.html` per surface as the visual target. Optionally copy the 20 `preview/*.html` for reference only. **NOT** committing the JSX prototypes — we'll rewrite as TSX.
2. **Token wiring:**
   - Add the `:root { --night: ... }` block from `colors_and_type.css` to `apps/web/app/globals.css`.
   - Add the 6 Google Font imports to `apps/web/app/layout.tsx` via `next/font`, bind each to its `--font-*` CSS variable.
   - Extend `apps/web/tailwind.config.ts` with the palette + `fontFamily` keys so utilities like `bg-vellum`, `font-display` resolve.
3. **Copy SVG assets** into `apps/web/public/kit/*.svg`.
4. **Shared primitive components** in `apps/web/components/scriptorium/*` (one TSX per primitive):
   - `NightRoom.tsx` — page-level container (night bg + lantern rig + light pool)
   - `Desk.tsx` — stained-oak surface with bronze corner bosses
   - `TagNav.tsx` — vellum shipping-label nav tags
   - Surface primitives: `ScrollCard`, `VellumCard`, `LedgerCard`, `EnvelopeCard`, `JournalCard`, `MapCard`
   - Ornaments: `WaxSeal`, `DropCap`, `Medallion` (with earned / aged / unearned states)
   - Typographic: `Kicker`, `Byline`, `ScribeDivider`, `DisplayHeading`
   - Brand: `Brand` (bronze medallion + "Arcadia" wordmark + optional tagline)
   - Buttons: `BronzeButton` (primary), `WaxButton` (destructive / seal), `GhostButton` ("set aside")
   - Form fields: `VellumField` (italic display on bronze underline)
5. **Simulation scaffolding:**
   - `apps/web/lib/simulation-mode.ts` — hybrid localStorage + URL param reader. Exports `isSimulationOn()` (SSR-safe), `setSimulation(on)`, `useSimulationMode()` hook.
   - `apps/web/lib/fixtures/` dir — empty for now. Populated per-surface in later sub-phases.
   - `apps/web/lib/fetch-or-mock.ts` — generic `<T>(real: () => Promise<T>, mock: T) => Promise<T>` for server components; React hook `useFetchOrMock<T>(real, mock)` for client.
   - `<SimulationToggle />` component — a wax-seal-styled toggle in the shell top-right.
   - `<SimulationBadge />` — persistent lantern-coloured pill in top-right when sim is on (same position used by capacity HUD inside Phaser scenes).
6. **ADR 0010** — `planning/decisions/0010_2026-04-24_design-token-wiring-and-simulation-mode.md`. Records the token wiring technique + the simulation-mode hybrid persistence + the fixture layout convention.

**Exit criteria 8.0:**
- Typecheck clean; existing 191 tests still pass.
- `bg-vellum`, `text-ink`, `font-display` utilities visually correct on a scratch page.
- `SimulationToggle` flips state; `SimulationBadge` appears when on; survives page refresh (localStorage); `?sim=1` overrides localStorage when present.
- At least one primitive (`VellumCard`) rendered on a scratch page and visually matches the `08-surfaces.html` preview from the kit.

---

### Sub-phase 8.1 — `/kit` route (design-system browser)

**Scope:** A single authenticated route showing every primitive + token, populated from the 20 `preview/*.html` designs. Useful as a live spec and for visual regression.

**Steps:**
1. New route `apps/web/app/kit/page.tsx`. Authenticated; tab-nav labeled `the kit` (the 4th vtag).
2. Grid of sections mirroring the 20 preview HTMLs: Colors → Type → Surfaces → Spacing → Radii → Elevation → Buttons → Fields → Chips → Medallions → Hardware → Drop caps → Logo → Ornaments → Dividers.
3. Each primitive rendered from the shared TSX components built in 8.0. No fixtures / no data.

**Exit:** /kit loads, all 20 sections render, all tokens visible.

---

### Sub-phase 8.2 — Creator dashboard (`/dashboard` + tabs)

**Scope:** The big one. Rebuild the creator studio against the `ui_kits/dashboard/` kit. Current `/dashboard` has Phase-3 → Phase-5 course CRUD + analytics; Phase 8 re-skins without breaking that logic.

**Reads first:** `ui_kits/dashboard/{Shell,Dashboard,Courses,Memberships,Audience,Payouts,Settings}.jsx` + `data.v2.js` + `index.html` (visual target). Existing `apps/web/app/dashboard/**` for server actions + current data shapes.

**Steps:**
1. **Dashboard shell** — `<DashboardShell active={tab}>` component wrapping every tab. Brand header, 6-tab nav, date-range selector (`7d` / `30d` / `90d` / `year`), avatar menu, footer scribe line.
2. **Route layout** — `apps/web/app/dashboard/layout.tsx` applies the shell.
3. **`studio` tab** (the landing `/dashboard`) — hero, KPI strip, revenue+ROI card, subscribers card, funnel card, activity feed. Each section:
   - Wraps a `useFetchOrMock(realFetcher, fixture)` call.
   - Real fetcher reads from existing server actions + new ones where needed (flag gaps).
   - Fixture imported from `lib/fixtures/dashboard-studio.ts` — matching the `data.v2.js` values.
4. **`courses` tab** (`/dashboard/courses`) — ledger-card rows per course. Existing Phase 3-5 CRUD preserved; server actions untouched; only the TSX changes.
5. **`memberships` tab** (`/dashboard/memberships`) — **new route, shell only** until we know what schema fields exist. Phase 8 ships the layout; real data wire-up deferred.
6. **`audience` tab** (`/dashboard/audience`) — **new route, shell only** for same reason.
7. **`payouts` tab** (`/dashboard/payouts`) — **new route, shell only.** Stripe integration is not in Phase 8 scope.
8. **`settings` tab** (`/dashboard/settings`) — **new route, shell only.**
9. **Analytics** (`/dashboard/courses/[id]/analytics`) — reskin the existing Phase-5 page with journal-card surface + hand-drawn SVG line chart. Simulation toggle flips between real `fetch.ts` data and a `lib/fixtures/analytics.ts` fixture.
10. **Charts** — `lib/charts/line.ts`, `lib/charts/bar.ts`, `lib/charts/sparkline.ts` as SVG-path utilities. Each takes a number array and returns a `<path d="...">` string + axis helpers.

**Scope flags:**
- `memberships`, `audience`, `payouts`, `settings` land as shells with `~ coming soon ~` copy inside.
- Studio KPIs that have no Supabase source (MRR, ROI) read from fixtures in sim mode, and from `null`/`0` with a placeholder in real mode. Real wire-up is a post-Phase-8 follow-up ADR.

**Exit:** Existing course CRUD still works. Studio page loads without errors in both real and sim mode. /dashboard/analytics visually matches the kit.

---

### Sub-phase 8.3 — `/hub` member home (new route)

**Scope:** New route; post-login destination. Entry-point grid into world / academy / market / tavern. XP / level / streak snapshot. Activity feed.

**Reads first:** `ui_kits/academy/index.html` isn't the hub — check if there's a dedicated hub kit or if the member-home layout is derived from the dashboard shell. If neither, extrapolate from the v4.5 `04-member-dashboard.html` reference already in `design/reference/`.

**Steps:**
1. Create `/hub` route, server component, session-gated.
2. Middleware extends protected matcher.
3. Layout: `<NightRoom>` → `<Desk>` → `<TagNav active="hub">` → drop-cap head → grid of map-cards (destinations) + envelope cards (XP / level / streak) + vellum-card (activity feed).
4. Update `/login`, `/signup`, `/onboarding/avatar` post-success redirects → `/hub`.
5. Authenticated users hitting `/` → redirect to `/hub`.
6. Wrap XP + level fetch in `useFetchOrMock`.

**Exit:** Post-login flow lands on `/hub`. Entry-point cards navigate. XP / level updates live (Phase-5 `useLevelSync` carries over).

---

### Sub-phase 8.4 — `/doorway` (login + signup + onboarding reskin)

**Scope:** Re-skin the three auth routes against the v4.5 `02-login.html` reference (already in `design/reference/`). OAuth buttons stay disabled per the earlier obsolete Phase-6 decision B.

**Steps:**
1. Reskin `/login`, `/signup`, `/onboarding/avatar` with the two-column doorway composition (night-scene left, scroll-card right).
2. Existing Supabase auth calls unchanged.
3. OAuth (Google + GitHub) buttons rendered disabled with Caveat tooltip "another door — not yet open."
4. On submit success: push to `/hub` per 8.3.

**Exit:** Full auth flow works end-to-end. `/security-review` clean.

---

### Sub-phase 8.5 — Academy React viewer (`/academy/[courseId]`)

**Scope:** Reskin the React course viewer (NOT the Phaser hall at `/academy`) with the `ui_kits/academy/` kit.

**Steps:**
1. Reskin `apps/web/app/academy/[courseId]/page.tsx` and its `_components/*` (VideoLessonViewer, WrittenLessonViewer).
2. Scroll-card for lesson body, drop cap on lesson intros, journal-card progress sidebar.
3. Wrap lesson fetch + progress fetch in `useFetchOrMock`.
4. Fixture in `lib/fixtures/academy-course.ts`.

**Exit:** Course viewer renders on the scriptorium design; lesson complete / uncomplete still persists via existing server actions.

---

### Sub-phase 8.6 — Market StallView (`/market` modal)

**Scope:** Reskin the `StallView` modal with the `ui_kits/market/` kit — the diegetic restyle deferred from Phase 7.3.

**Steps:**
1. Restyle modal as `<MapCard>` frame with `<EnvelopeCard>` course tiles. Wax-seal enrol CTA.
2. Session-local enrolled tracking from Phase 7 preserved.
3. Wrap stall fetch + enrolment fetch in `useFetchOrMock`.
4. Fixture in `lib/fixtures/market-stalls.ts`.

**Exit:** StallView visually reads as a stall scroll on a map-card modal; enrolment flow still works; no enrol button for already-enrolled users.

---

### Sub-phase 8.7 — Tavern + Tent overlays

**Scope:** React overlays on top of Phaser scenes — `ChatPanel`, `LeaderboardPanel` (tavern), any coworking-inside overlay.

**Steps:**
1. Reskin `LeaderboardPanel.tsx` per `ui_kits/tavern/` — ledger-card rows, wax-seal rank markers, mono scores.
2. Reskin `ChatPanel.tsx` — vellum-card message container, italic display for usernames, Caveat for own messages.
3. Any coworking-inside overlay (occupancy pill, exit prompt wrapper) reskinned per `ui_kits/tent/`.
4. Simulation toggle affects leaderboard fetch only (chat is real-time, not fetched).

**Exit:** Tavern chat + leaderboard on design system; coworking overlays consistent.

---

### Phase 8 global test criteria

1. **Aesthetic continuity.** A tour of login → hub → dashboard → courses → academy viewer → market → tavern → coworking shows one consistent design system with no Tailwind-neutral strays, no Inter fallbacks, no old-style buttons.
2. **No regression.** Existing course CRUD, XP/level, Phaser scenes, Colyseus, RLS — all untouched. Phase 5 gamification + Phase 7 gameplay polish still work.
3. **Simulation toggle universal.** Every data-fetching surface wraps its fetcher. Flipping the toggle visually swaps the data. `SimulationBadge` visible whenever toggle is on.
4. **Performance.** LCP on `/dashboard` within 10% of current Tailwind baseline. `next/font` + the token CSS custom properties do not cause CLS.
5. **Bundle size.** Shared primitives (`components/scriptorium/*`) add no more than ~25 KB gzipped.

---

### Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| JSX prototypes in the kit reference `window.ArcadiaData` and `window.React` — pattern doesn't port directly | High | Rewrite as TSX with prop-based data + React imports; use the JSX as visual spec only, not code. Already planned. |
| Dashboard KPIs (MRR, ROI) require schema fields we don't have | Medium-High | Flag the gap; fixtures show the final look; real values are `0` / placeholder in real mode. Post-Phase-8 ADR to add the schema. |
| Hand-rolled SVG charts balloon beyond expected size | Medium | Cap at 3 utilities (line / bar / sparkline). If analytics needs more, reassess chart-lib decision. |
| Simulation toggle on server components requires passing a flag through every server action | Medium | Server components read via a `getSimulationFromCookies()` helper; cookies mirror localStorage at read time. Revisit if this is brittle. |
| Parallel Claude session touches files on main that Phase 8 also touches | Low-Medium | Merge early + often; sub-phases land as their own PRs so conflicts surface quickly. |
| Token wiring (globals.css + next/font + tailwind) breaks existing pages | Medium | Land 8.0 foundation on this branch, deploy preview, smoke every route in sim mode + real mode before 8.1 starts. |

---

### Naming + commits

- **Branch:** `phase-08_ui-wireup` (current).
- **Sub-phase commits:** prefix `8.0:`, `8.1:`, ... `8.7:`.
- **Status log:** `phases/phase-08_status.md` — one file, newest-on-top, opened post-approval.
- **Sub-phase PRs:** one PR per sub-phase so each can be reviewed + merged independently when ready. Or a single big PR at the end — builder's choice; default is per-sub-phase for safety.
- **Changelog:** single entry at phase exit, `docs/changelog/YYYY-MM-DD_phase-08-ui-wireup.md`.

---

### Deferred to a later phase (record here so it doesn't get lost)

- **Real OAuth providers.** Separate ADR needed.
- **Supabase schema additions** for the dashboard KPIs that have no source today (MRR, churn, ROI, spend tracking).
- **Stripe Connect / Payouts integration.** `/dashboard/payouts` is a shell only in Phase 8.
- **Admin / keeper tooling.** `/dashboard/settings` + team / moderation stays out of scope.
- **Email / notification surfaces.** Not in the kit.
