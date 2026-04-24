# 2026-04-24 · Phase 8 — UI wire-up · exit

**Branch:** `phase-08_ui-wireup` → `main`
**Source plan:** `phases/phase-08_plan.md`
**Status log:** `phases/phase-08_status.md`
**ADR:** `planning/decisions/0010_2026-04-24_design-token-wiring-and-simulation-mode.md`

Every authenticated React surface in `/apps/web` was rebuilt on the
**midnight-scriptorium** design system delivered at the end of Phase 6.
Every data-fetching surface now wraps its real fetcher in
`useFetchOrMock(realFetcher, fixture)` so the simulation toggle swaps
real data for hand-authored fixtures without round-trips. Visual
composition for each dashboard tab lives in a shared
`_components/*Content.tsx` module so the auth-gated route and a new
public `/preview/*` route render the same UI from the same props.

## What shipped

### Foundation

- **Token wiring** — `:root` block copied into `apps/web/app/globals.css`;
  six Google fonts loaded via `next/font` in `app/layout.tsx` and bound
  to `--font-*` variables; Tailwind extended with the palette and
  `fontFamily` keys. `scriptorium.css` ships the class-styles for
  surfaces, buttons, fields, chips, drop caps, etc.
- **Scriptorium primitives** (`apps/web/components/scriptorium/`):
  `NightRoom`, `Desk`, `TagNav`, `BrandMark`, `ScrollCard`, `VellumCard`,
  `LedgerCard`, `EnvelopeCard`, `JournalCard`, `MapCard`, `WaxSeal`,
  `DropCap`, `Medallion`, `Stud`, `Avatar`, `Kicker`, `Hand`,
  `ChapterDivider`, `BronzeButton`, `WaxButton`, `GhostButton` (with
  `onDark` opt-in), `VellumField` (forward-ref), `Chip`, `SimulationToggle`,
  `SimulationBadge`, and the 8.10 chart primitives below.
- **Chart primitives** — `Donut` + `BarProgress` + `Stat` + `StackedBar`
  in `components/scriptorium/charts.tsx`, with pure geometry in
  `lib/charts/donut.ts` (7 vitest cases). Existing `buildSparkline`
  reused across GrowthHero, RevenueRoiCard, and the payouts monthly
  strip.
- **Simulation framework** — client hook `useSimulationMode`, server
  helper `fetchOrMock`, `SimulationToggle` (wax-seal pill in the shell
  top-right), `SimulationBadge` (lantern-yellow indicator when sim is
  on), hybrid `localStorage` + `?sim=1` URL param persistence.
- **ADR 0010** records the token wiring + simulation persistence
  conventions.

### Routes rebuilt / redesigned

- **`/`** — three-doorway landing (World / Market / Dashboard) with drop
  cap greeting, scroll / vellum / ledger cards, wax / verdigris / gilt
  seals. Unauthed `Gate` variant with bronze + wax CTAs.
- **`/login`** + **`/signup`** — ScrollCard scroll-forms, blue / wax
  drop cap, vellum underline fields, bronze "open the door →" / wax
  "seal the pact". Autofill override so Chrome's yellow doesn't clash.
- **`/kit`** — public design-system browser. Nine chapters mirroring
  the downloaded kit's 21 preview HTMLs.
- **`/dashboard`** (studio landing) — 5-col KPI strip, RevenueRoiCard
  (Donut + spend breakdown + 4× ROI badge), MyCourses filter-table,
  FunnelCard, ActivityFeed, ActiveFolkCard envelope.
- **`/dashboard/courses`** (kiln) — CoursesKpis, published CourseCard
  grid, draft "in the kiln" grid, LessonPerformance table (course
  picker + watched / dropoff / avg time + stacked bar), Reviews
  envelope. `CreateCourseDialog` rebuilt as a scriptorium scroll modal
  with drop cap, vellum fields, WaxButton.
- **`/dashboard/courses/[id]`** — two-pane editor reskinned: SectionTree,
  LessonList, WrittenLessonEditor, VideoLessonEditor, PublishToggle.
- **`/dashboard/courses/[id]/analytics`** — three KPI envelopes, journal
  sparkline, ledger activity.
- **`/dashboard/folk`** (merged memberships + audience) — GrowthHero +
  30-day sparkline, 4 KPI envelopes, MRRBlock with tier composition
  bar, five TierCards, Acquisition + Geography bar panels, Cohorts
  table, NewsletterPerf table, RetentionCurves SVG, AtRisk envelope,
  Members roll, Writing-to-folk placeholder.
- **`/dashboard/payouts`** (coin jar) — 4 KPI envelopes, monthly
  sparkline, 7-col history with gross / fee / net + reference,
  Transactions ledger (kind glyphs + status chips), TaxDocs envelope
  with year selector.
- **`/dashboard/settings`** (keeper's keys) — sticky sidebar nav with
  IntersectionObserver scrollspy, keeper + realm sections, email+push
  notifications table, Billing (three plan cards + payment method +
  invoice table), Integrations (6-tile grid · Stripe / Mailhouse /
  Bookpost / the Chronicler / Discord / Zapier), Security (2FA + last
  login + active sessions + danger zone).
- **`/academy/[courseId]`** — NightRoom + Desk + DropCap + LedgerCard
  chapter rail + ScrollCard / VellumCard lesson body. Written lesson
  viewer on a scoped `.scriptorium-prose`; video viewer in a
  bronze-rimmed frame. Desk ornaments (candle, book, quill+inkwell,
  sealed scroll) as low-opacity SVG background props.
- **`/market/_components/StallView`** — MapCard modal with DropCap +
  wax / verdigris seal + lesson preview list + "seal the pact"
  WaxButton + "step inside →" BronzeButton on enrol.

### Phaser scenes touched (non-aesthetic changes)

- **AcademyScene** — retired the floating-card podium pattern.
  Floating red-bound book at centre (no pedestal / caption); proximity
  prompt "Press ENTER to open the Scribe's Ledger" opens a scriptorium
  `LedgerScroll` React modal listing the member's courses.
- **MarketScene** — same treatment: floating blue crystal at centre;
  "Press ENTER to browse the catalog" opens a `CatalogScroll` React
  modal; picking a stall drops `?course=<id>` so the existing
  `StallView` opens.
- **SquareScene** — new `SQUARE_LODGE_ENTRY` trigger at the cabin in
  the top-right of `/world`. "Press ENTER to step into your lodge" →
  routes to `/`. Wired via `createEnterPromptManager` and ordered
  before the edge triggers so a single ENTER can't double-fire.
- **Shared `scenes/shared/proximity-prompt.ts`** — new helper. Same
  visual pill as `enter-prompt` but the ENTER handler is a caller-
  supplied callback instead of a route navigation. ENTER pills
  rebuilt in scriptorium voice: IM Fell English italic, vellum text
  on 0.95-alpha night, bronze-deep + bronze-bright double border, 4 px
  corners.

### Contrast & accessibility

- `.kicker` (class) promoted from `--ink-quiet` (~2.4:1 on vellum) to
  `--ink-soft` (~10:1). Applies to every kicker site.
- `Th` inline styles on analytics / folk / payouts dashboards
  promoted from `--gilt` (~1.7:1) to `--ink-soft` (~10:1).
- Token bumps: `--ink-quiet` `#8f7b68` → `#735844` (~4.1:1),
  `--ink-faint` `#6e5544` → `#5a402c` (~5.2:1).
- Folk streak chip moved from `--gilt-deep` (~3:1) to `--oxblood`
  (~7:1) at weight 500.
- Academy viewer Roman-numeral chapter numerals: `--gilt-deep` →
  `--bronze-deep`, weight 500. `+ add lesson` inline action: same.
- `GhostButton` default flipped from vellum (correct on dark) to ink
  (correct on vellum — the more common surface). `onDark` opt-in on
  shell-header callsites.

### Fixtures added

`apps/web/lib/fixtures/` gained:

- `folk.ts` — `money`, `tiers`, `retentionCurves`, `atRisk`, `growth`,
  `acquisition`, `geography`, `cohorts`, `newsletter`, `members`.
- `courses.ts` — `kpis`, `courses` (published + draft + review),
  `lessonPerf` (per-lesson watched / dropoff / avg-time), `reviews`.
- `payouts.ts` — expanded with `gross` / `fee` / `net` / `reference` +
  `transactions` + `taxDocs`.
- `settings.ts` — expanded `notifications` to email + push columns;
  added `billing` (plans + payment method + invoices), `integrations`
  (6 tiles), `security` (2FA + sessions).
- `dashboard-studio.ts` — `money.revenueSeries`, `money.spendSeries`,
  `money.spend30d`, `money.revenueByStream`, `money.spendBreakdown`,
  `myCourses`, `funnel`.

### Preview routes (public, no auth)

Purpose: design review + shareable screenshots without a session. Each
renders the real `<TabContent>` against its fixture.

- `/preview/folk`
- `/preview/courses`
- `/preview/payouts`
- `/preview/settings`
- `/preview/studio`

Controlled by `PUBLIC_PREFIXES = [..., '/preview']` in `middleware.ts`.

## What's still deferred

- Real OAuth providers (separate ADR).
- Supabase schema for the analytics the UI now renders (MRR, churn,
  ROI, spend tracking, cohort retention, per-lesson dropoff, reviews).
- Stripe Connect + real payouts. History + transactions + tax docs
  render from fixtures only.
- Newsletter integration. `NewsletterPerf` card is fixture-only.
- Dedicated `/hub` member-home route. Cabin entry in `/world` still
  points to `/`.
- Tavern + Tent overlay reskins (chat panel + leaderboard + coworking-
  inside overlays). Gameplay overlays still on pre-Phase-8 styling.

## Exit test criteria

See `phases/phase-08_status.md` for the full table. All hard criteria
(aesthetic continuity, no regression, universal simulation toggle) are
met. Formal LCP + bundle-size measurement deferred to a post-phase
follow-up; `next build` first-load JS for `/dashboard` stays around
165 kB, in line with pre-Phase-8.

## Commit history

29 commits from `phase-08_ui-wireup`. Highlights:

- `8.0` foundation · tokens + primitives + simulation
- `8.1` /kit route
- `8.2` dashboard rebuild · studio + courses + 4 shell tabs + analytics
- `8.5` academy student viewer reskin
- `8.6` landing + ghost contrast + academy props + lectern/crystal rewire
- `8.7` login/signup scroll + create-course modal + contrast pass
- `8.8` strip pedestals + scriptorium prompt pills + square lodge entry
- `8.9` dashboard shell · exit links
- `8.10.A` · chart primitives + public /kit
- `8.10.B1`–`B8-9` · folk (9 sections · 6 commits)
- `8.10.C` · courses kiln (5 sections · 1 commit)
- `8.10.D` · payouts (3 sections · 1 commit)
- `8.10.E` · settings (4 sections + sidebar · 1 commit)
- `8.10.F` · studio landing (3 sections · 1 commit)
