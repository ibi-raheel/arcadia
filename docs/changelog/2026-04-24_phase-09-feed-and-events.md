# 2026-04-24 · Phase 9 — async feed + live events · exit

**Branch:** `feature/feed-and-events` → `main`
**Plan:** `phases/phase-09_plan.md`
**Status:** `phases/phase-09_status.md`
**Migration:** `apps/web/supabase/migrations/20260424000001_phase9_feed_and_events.sql`

Shipped two community-memory features:

1. **Async feed** — a tablet in the tavern pops a scriptorium
   ScrollCard listing posts + events sorted newest-first, so a member
   who logs in twice a week sees "what happened while I was gone" the
   moment they walk in.
2. **Live events in-world** — creator schedules Q&A / office hours /
   cohort kickoff in a new `/dashboard/events` tab. When an event is
   *live*, the tavern gets a verdigris "live now" banner and the
   creator's YouTube stream plays in a stage overlay. Colyseus
   already syncs the avatars — so 50 members in the same tavern shard
   feels like an auditorium, not 50 thumbnails.

## What shipped

### Data layer

- Migration adds `posts` + `events` tables. RLS: read scoped to
  same-realm members; writes restricted to creators/admins via the
  existing `user_has_creator_role()` helper. Migration is idempotent
  with `IF NOT EXISTS` so re-running is safe.
- `posts.kind ∈ {text, announcement, event-created}`. An
  `event-created` post is auto-inserted whenever `createEvent` fires,
  with `metadata.event_id` linking back to the event so the feed row
  can render the event card inline.
- `events` carries `starts_at`, `ends_at`, optional `stream_url`,
  and a `location` (`tavern-a/b/c`) so events can be scoped to a
  specific tavern shard.

### Server actions (`app/_actions/feed.ts`)

- `loadFeed` — posts + events for the caller's realm in one round-trip
  (plus a memberships join for display names).
- `loadEvents` — events only, for the banner + pill paths that don't
  need the post timeline.
- `createPost`, `createEvent`, `updateEvent`, `deleteEvent` — all
  typed `{ok, value|error}` returns. Creator-role checked in-app so
  the client can surface "only creators can post" without waiting on
  the RLS error.

### UI components

- **`FeedScroll`** (`components/feed/FeedScroll.tsx`) — ScrollCard
  modal. Header with DropCap, optional live-now banner
  ("join the auditorium →" CTA), optional upcoming-event card,
  timeline of posts (text / announcement / event-created), inline
  composer at the bottom visible when `canPost` is true (`⌘+Enter`
  hotkey). Event-created posts render the full event card inline via
  `metadata.event_id`.
- **`TavernFeatures`** (`components/tavern/TavernFeatures.tsx`) — the
  tavern overlay. Loads feed + events via `useFetchOrMock`, polls the
  game ref every 500ms until Phaser mounts then wires the
  `tavern:open-feed` listener, drops a verdigris banner top-center
  when an event is live in this tavern's shard, and renders a
  collapsible YouTube stage embed in the top-right when the live
  event has a `streamUrl`. Re-ticks every 30s so the live/upcoming
  transition happens without a reload.
- **`/dashboard/events`** — new dashboard tab between `courses` and
  `folk`. 4-col KPI strip, live / upcoming / past sections with
  colour-coded accents (verdigris / lantern / ink-faint), inline
  create + edit forms with datetime-local fields + tavern-location
  dropdown.
- **`UpcomingEventPill`** (`components/events/UpcomingEventPill.tsx`)
  — compact click-through pill. Mounted in the studio actions row
  (onDark) and on the `/` landing above the doorway cards. Routes to
  `/tavern?b=<location>`.

### Phaser scene touches

- **`tavernSpritesConfig.tablet`** — new `{ centerX, centerY,
  interactRadius }` block pointing at the small screen on the right
  shelf of the tavern interior.
- **TavernScene** — new `tabletPrompt: ProximityPromptManager` wired
  via the Phase-8 `createProximityPromptManager` helper. Emits
  `TAVERN_OPEN_FEED_EVENT` on ENTER. Ordered before the archway exit
  prompt so a single ENTER press can't double-fire.

### Pure helpers

- `lib/events/status.ts` — `eventStatus`, `nextEvent`, `liveEvent`,
  `relativeTime`, `formatEventWhen`. All pure, 17 vitest cases in
  `lib/events/__tests__/status.test.ts`.

## Fixtures

- `lib/fixtures/feed.ts` — 5 posts anchored to a fixed `NOW_ISO` so
  the "N minutes ago" labels read sensibly under sim mode.
- `lib/fixtures/events.ts` — 4 events (live-now, two upcoming, one
  past) anchored to the same `NOW_ISO`. Live-now carries a YouTube
  embed URL so the stage embed demos immediately.

## Commits

- `feat(feed+events): migration + async feed + tavern integration`
- `feat(events): dashboard events tab + upcoming pill on studio + landing`
- `docs(phase-09): plan + status + changelog`

## Before this PR merges

The Supabase MCP is read-only (ADR 0002), so the migration file has
**not** been applied yet. The dev needs to run:

```bash
cd apps/web
supabase db push
```

Or paste the SQL from the migration file into the Supabase dashboard's
SQL editor for the `eqbzltiasmuckgsapkye` project. Until then, both
new tabs render fixture data (the app falls back to fixtures when the
real reads fail). Writes will 404 at the RLS layer until the migration
lands.

## Deferred

- Supabase Realtime subscription for feed live-insert.
- Post reactions + threads.
- Recurring event series.
- YouTube URL normalisation (`watch?v=` → `/embed/…`).
- In-scene stage sprite (currently a React iframe overlay).
- Push notifications / email reminders for event start.
