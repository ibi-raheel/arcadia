# Phase 8 — Status

Source plan: `phase-08_plan.md`. Entries chronological, newest on top.

## 2026-04-24 — Phase 8 complete · merged to main

All ten sub-phases landed on `phase-08_ui-wireup`. Branch merged to `main`.
Phase-exit changelog: `docs/changelog/2026-04-24_phase-08-ui-wireup.md`.

**Shipped sub-phases:**

- **8.0** — Foundation: token wiring (CSS custom properties + `next/font` + Tailwind extension), scriptorium primitive components (`NightRoom`, `Desk`, `TagNav`, surface cards, `WaxSeal`, `DropCap`, `Medallion`, `Kicker`, `Hand`, `Brand`, buttons, `VellumField`), simulation framework (`isSimulationOnClient`, `useSimulationMode`, `useFetchOrMock`, `SimulationToggle`, `SimulationBadge`), ADR 0010 recorded.
- **8.1** — `/kit` route: live design-system browser. Nine chapters (colours, lettering, surfaces, hardware, illumination, actions, medallions, ornaments, charts). Made public (no auth) in 8.10.A so design reviewers can open it without a session.
- **8.2** — Creator dashboard: 5-tab `DashboardShell`, studio landing + courses list reskin + analytics reskin + folk/payouts/settings shells + SVG sparkline utility + course detail shell + course editor internal reskin (SectionTree, LessonList, Written/Video LessonEditor, PublishToggle).
- **8.3** — Member hub: deferred. The lodge entry in the square currently routes to `/` (the landing). A dedicated `/hub` page is punted to a post-Phase-8 follow-up. The landing itself was redesigned in 8.6 as three doorway cards.
- **8.4** — Doorway: `/login` and `/signup` rebuilt as ScrollCard scroll-forms (blue drop-cap on login, wax drop-cap on signup). Chrome autofill override so the yellow doesn't clash with the vellum fields.
- **8.5** — Academy viewer: `/academy/[courseId]` rebuilt on NightRoom + Desk + DropCap + LedgerCard chapter rail + ScrollCard/VellumCard lesson body. `WrittenLessonViewer` prose swapped from `prose-invert` to a scoped `.scriptorium-prose`. `VideoLessonViewer` bronze-rimmed frame. Desk ornaments (candle, open book, quill+inkwell, sealed scroll) added as low-opacity SVG background props.
- **8.6** — Market StallView: `MapCard` modal with DropCap + wax/verdigris seal + lesson preview list + "seal the pact" WaxButton. Landing redesign (three doorway cards). GhostButton contrast fix at the primitive level. Academy/market Phaser scenes: pedestal + caption stripped, floating book/crystal only + proximity prompts restyled to scriptorium.
- **8.7** — Polish + contrast: `/kit` made public, kicker/Th colour promoted to `--ink-soft` (~10:1 on vellum), `ink-quiet` / `ink-faint` tokens darkened, streak highlight moved to `--oxblood`, login scroll, signup scroll, create-course scriptorium modal.
- **8.8** — Strip pedestals + ENTER prompt restyled + square lodge entry wired (cabin in top-right of `/world` → `/`).
- **8.9** — Dashboard shell exit links ("← return to the world", "exit") in every `DashboardShell` header.
- **8.10** — Audit-driven backfill against the V4.5 kit — **26 items across 6 groups**:
  - **A** · Donut + BarProgress + Stat + StackedBar primitives; `/kit` public
  - **B** · folk tab · MRRBlock, 5 TierCards, RetentionCurves SVG, AtRisk envelope, GrowthHero, Acquisition, Geography, Cohorts, NewsletterPerf
  - **C** · courses tab · KPI strip, published CourseCard grid, draft "in the kiln" grid, LessonPerformance, Reviews
  - **D** · payouts tab · 7-col history (gross / fee / net), Transactions ledger, TaxDocs envelope
  - **E** · settings tab · sidebar navigation (scrollspy), Billing (plan cards + payment + invoices), Integrations (6-tile grid), Security (2FA + sessions + danger zone)
  - **F** · studio landing · Revenue/ROI card with donut + spend breakdown + ROI badge, MyCourses filter-table, Funnel panel
  - Public `/preview/folk`, `/preview/courses`, `/preview/payouts`, `/preview/settings`, `/preview/studio` render every tab against fixtures — no session required for design review.

**Phase-8 exit criteria (from plan):**

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Aesthetic continuity — one consistent design system across login → landing → dashboard → courses → academy → market → tavern → coworking | ✅ |
| 2 | No regression — course CRUD, XP/level, Phaser, Colyseus, RLS untouched | ✅ |
| 3 | Simulation toggle universal — every data-fetching surface wraps its fetcher | ✅ |
| 4 | Performance — LCP on `/dashboard` within 10% of baseline | 🟡 not formally measured; no obvious regressions in `next build` bundle report |
| 5 | Bundle size — primitives ≤ 25 KB gzipped | 🟡 not formally measured; `next build` shows `/dashboard` around 165 kB first-load, in line with pre-Phase-8 |

**Follow-ups explicitly deferred** (record here so they don't get lost):

- Real OAuth providers (separate ADR).
- Supabase schema for the analytics the UI already renders — MRR, churn, ROI, spend tracking, cohort retention, lesson dropoff, reviews table.
- Stripe Connect + real payouts. `/dashboard/payouts` history + transactions + tax docs render from fixtures only.
- Newsletter integration. `NewsletterPerf` card is fixture-only until Mailhouse / Bookpost lands.
- Dedicated `/hub` member-home route. Cabin entry in `/world` currently points to `/`.
- Tavern + Tent overlay reskins from the 8.7 plan (chat panel + leaderboard panel + coworking-inside overlay). Gameplay overlays still on pre-Phase-8 styling.

## 2026-04-24 — Phase 8 kickoff · decisions A–I locked

User approved the recommended value for every pre-plan decision (A through I). Table filled in on `phase-08_plan.md`. Sub-phase 8.0 step 1 starts next: import the kit assets from `/Users/aria/Downloads/Claude Design - Arcadia/` into `design/kit/`.

Working branch: `phase-08_ui-wireup` (off main, rebased post-CI-hotfix `#13`).

Pre-push check reminder (from CLAUDE.md rule added 2026-04-24): every push runs `format:check + lint + typecheck + vitest` locally first. CI failures are much easier to prevent than to chase retroactively.
