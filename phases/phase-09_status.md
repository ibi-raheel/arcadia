# Phase 9 — Status

Source plan: `phase-09_plan.md`. Entries chronological, newest on top.

## 2026-04-24 — Phase 9 complete · PR open

All 8 sub-phases shipped on `feature/feed-and-events`. PR #15 open
against `main`.

**Shipped:**

- **9.0** — Migration `20260424000001_phase9_feed_and_events.sql`:
  `posts` + `events` tables with RLS (same-realm read, creator-only
  write). MUST be applied by hand (`supabase db push`) — the Supabase
  MCP is read-only per ADR 0002.
- **9.1** — Fixtures (`lib/fixtures/feed.ts`, `lib/fixtures/events.ts`)
  + pure helpers (`lib/events/status.ts`) with 17 vitest cases.
- **9.2** — `components/feed/FeedScroll.tsx` modal (ScrollCard +
  DropCap + timeline + banner + composer).
- **9.3** — Server actions in `app/_actions/feed.ts`: `loadFeed`,
  `loadEvents`, `createPost`, `createEvent`, `updateEvent`,
  `deleteEvent`.
- **9.4** — Tablet proximity trigger in TavernScene via the
  Phase-8 `proximity-prompt.ts` helper. `TAVERN_OPEN_FEED_EVENT`
  plumbed through `game.events`.
- **9.5** — `components/tavern/TavernFeatures.tsx` mounts the feed
  modal + verdigris "live now" banner + collapsible YouTube stage
  embed when an event is live and has a `streamUrl`.
- **9.6** — `/dashboard/events` tab with KPI strip + live/upcoming/
  past sections + inline create + edit forms + delete. Tab key
  `events` added to `DashboardShell`.
- **9.7** — `components/events/UpcomingEventPill.tsx` compact pill
  rendered on `/dashboard` studio actions + the `/` landing.
- **9.8** — Docs: this status file, phase-09 plan, changelog,
  `components/game/scenes/tavern/CLAUDE.md` updated for the tablet
  trigger.

**Phase-9 exit criteria:**

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Creator schedules event in `/dashboard/events` → event-created post appears in feed | ✅ (real-mode, requires migration applied) |
| 2 | Tablet proximity prompt opens FeedScroll | ✅ |
| 3 | Live event (`now ∈ [starts, ends]` + `streamUrl`) shows banner + stage embed | ✅ |
| 4 | `UpcomingEventPill` on `/` + `/dashboard` routes to `/tavern?b=<location>` | ✅ |
| 5 | 5-stage CI (format / lint / typecheck / vitest / next build) green | ✅ (263 tests, all pass) |

**Before the PR merges:**

- Apply the migration to the prod Supabase project (`eqbzltiasmuckgsapkye`).
- Optional: update the test project too (`idxgcrwikmcuqrrxbogj`) if
  integration tests will hit it.

**Follow-ups deferred** (see `phase-09_plan.md` for rationale):

- Supabase Realtime subscription for feed live-insert.
- Post reactions + threads.
- Recurring event series.
- YouTube URL normalisation helper.
- In-scene stage sprite (currently a React overlay).
