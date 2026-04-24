# Phase 9 — Status

Source plan: `phase-09_plan.md`. Entries chronological, newest on top.

## 2026-04-24 — Post-merge hotfix: client refresh after mutation

After PR #15 merged + migration landed, first creator write surfaced two
client-side bugs on `/dashboard/events`:

1. `useFetchOrMock` was keyed only on `[sim]` — `revalidatePath` in the
   server action invalidated the Next cache but did not re-run the client
   hook, so a successful create / update / delete kept showing stale
   state until full reload.
2. `loadEventsReal` swallowed `loadEvents` errors to `{events: []}`, so
   "not signed in" / "no realm membership" silently rendered as the
   empty-state card.

**Fixed (on `main`):**

- `lib/fetch-or-mock.ts` — hook now returns a `refetch()` the caller can
  invoke after a mutation; effect is keyed on `[sim, tick]`.
- `app/dashboard/events/page.tsx` — throws on real-load failure so the
  red error card surfaces the actual cause; passes `refetch` down.
- `app/dashboard/events/_components/EventsContent.tsx` — threads
  `onChanged` through `CreateEventForm` / `EditEventForm` / `EventCard`
  so every mutation refetches the list.

No schema changes; no other `useFetchOrMock` consumer breaks (they only
destructure `{data, loading, error}`).

## 2026-04-24 — Migration applied to prod Supabase

`20260424000001_phase9_feed_and_events.sql` pushed to
`eqbzltiasmuckgsapkye`. Had to `supabase migration repair --status
applied` the six prior phase-3/4/5 migrations first because they were
applied via the dashboard SQL editor and never recorded in the remote
`supabase_migrations.schema_migrations` table — phase-3 policies + the
phase-5 trigger are **not** idempotent, so `db push` would have failed
mid-way if we hadn't repaired tracking first.

Verified in prod: `public.posts` + `public.events` live, RLS enabled,
4 policies per table (select / insert / update / delete).

## 2026-04-24 — Phase 9 complete · PR merged

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
| 1 | Creator schedules event in `/dashboard/events` → event-created post appears in feed | ✅ (migration applied 2026-04-24; real-mode verified) |
| 2 | Tablet proximity prompt opens FeedScroll | ✅ |
| 3 | Live event (`now ∈ [starts, ends]` + `streamUrl`) shows banner + stage embed | ✅ |
| 4 | `UpcomingEventPill` on `/` + `/dashboard` routes to `/tavern?b=<location>` | ✅ |
| 5 | 5-stage CI (format / lint / typecheck / vitest / next build) green | ✅ (263 tests, all pass) |

**Post-merge:**

- ✅ Migration applied to prod Supabase (`eqbzltiasmuckgsapkye`, 2026-04-24).
- ✅ Client refresh + error-surfacing hotfix (see entries above).
- Optional: update the test project too (`idxgcrwikmcuqrrxbogj`) if
  integration tests will hit it.

**Follow-ups deferred** (see `phase-09_plan.md` for rationale):

- Supabase Realtime subscription for feed live-insert.
- Post reactions + threads.
- Recurring event series.
- YouTube URL normalisation helper.
- In-scene stage sprite (currently a React overlay).
