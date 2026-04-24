## Phase 9 Plan: async feed + live events in-world

**Source:** Post-Phase-8. Two community-memory features the user flagged
as missing:
1. An **async feed** — the "memory of the community". Members who log
   in 2-3× a week see "what happened while I was gone" the moment they
   walk into the tavern.
2. **Live events in-world** — Q&A / office hours / cohort kickoff held
   inside the tavern. 50 avatars filling the room feels like 50 people,
   not 50 Zoom thumbnails.

**Goal:** creator can post to the feed + schedule live events; members
see both at the tablet in the tavern; when an event is live, the tavern
becomes the auditorium (verdigris banner + stage embed).

**Branch:** `feature/feed-and-events`.

**Out of scope:**

- Real-time updates — feed polls / revalidates on navigation; a
  Supabase Realtime subscription is a follow-up.
- Reactions on posts. Metadata column makes this easy later.
- Recurring events. Today's schema is single-instance.
- Notifications / emails when an event starts.
- Per-building event sharding beyond choosing a tavern (`tavern-a/b/c`).
- Background music, custom event art.

---

### Sub-phases

**9.0** · Supabase migration: `posts` + `events` tables + RLS (same-
realm read, creator-only write). Idempotent with `IF NOT EXISTS`. Needs
manual `supabase db push` (MCP is read-only per ADR 0002).

**9.1** · Fixtures (`lib/fixtures/feed.ts`, `lib/fixtures/events.ts`) +
pure helpers (`lib/events/status.ts` — `eventStatus`, `nextEvent`,
`liveEvent`, `relativeTime`, `formatEventWhen`). 17 vitest cases.

**9.2** · FeedScroll modal (`components/feed/FeedScroll.tsx`) —
scriptorium ScrollCard + DropCap + timeline + live/upcoming banner +
composer. Purely presentational.

**9.3** · Server actions (`app/_actions/feed.ts`) — `loadFeed`,
`loadEvents`, `createPost`, `createEvent`, `updateEvent`, `deleteEvent`.
Discriminated `{ok, value|error}` return shape. RLS handles the real
auth; actions validate shape + bounce with typed errors.

**9.4** · Tablet proximity trigger in TavernScene.
`tavernSpritesConfig.tablet` at (1100, 430) · radius 150. Uses the
Phase-8 `proximity-prompt.ts` helper. Emits `TAVERN_OPEN_FEED_EVENT`
on ENTER. Ordered before the archway prompt.

**9.5** · `TavernFeatures` overlay in GameTavern — polls gameRef to
bind the feed listener, `useFetchOrMock(loadFeed, fixture)` for data,
verdigris "live now" banner at the top of the viewport, collapsible
stage embed (YouTube iframe) in the top-right when a live event has a
`streamUrl`. 30s re-tick so the banner appears/disappears at the right
boundary.

**9.6** · `/dashboard/events` tab in the DashboardShell (between
`courses` and `folk`). Shell + KPI strip + live/upcoming/past sections.
Inline create + edit forms with vellum datetime-local inputs + tavern-
location dropdown. Delete guarded by `window.confirm`.

**9.7** · `UpcomingEventPill` compact component — mounted in the studio
actions area (onDark) and on `/` above the doorway cards. Click →
`/tavern?b=<location>`.

**9.8** · Docs — phase plan + status log + changelog + scene CLAUDE.md
update for the tablet trigger.

---

### Test criteria

1. Creator navigates to `/dashboard/events`, fills the form, hits
   "seal the event" — the event appears in the "upcoming" section; a
   feed post of kind `event-created` lands in the tavern feed.
2. Member walks to the tablet in the tavern; proximity prompt shows
   "Press ENTER to read the feed"; ENTER opens FeedScroll with the
   post timeline.
3. Creator schedules an event whose `starts_at` is `now() - 10 min` and
   `ends_at` is `now() + 50 min` with a YouTube embed URL. The verdigris
   "live now" banner appears at the top of `/tavern`; the stage embed
   renders the iframe in the top-right corner.
4. Two browser tabs in the same tavern shard both see the member's
   avatars AND the stream playing — Colyseus already covers the avatar
   sync; the iframe is client-local so both tabs tune in independently.
5. `UpcomingEventPill` on `/` and `/dashboard` shows the next event
   title + relative time; clicking routes to `/tavern?b=<location>`.

---

### Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Supabase MCP is read-only so the migration isn't applied at code time | High | Migration file is written idempotently. Fixtures carry the full data shape so the feature demos even before the migration runs. `supabase db push` before merge. |
| Tablet coords don't align with the pixel location of the on-screen screen | Medium | `tavernSpritesConfig.tablet` has three numbers — nudge in a follow-up commit once the dev verifies visually. |
| YouTube iframe URL drift (creator pastes a `watch?v=` link, not an `embed/` link) | Medium | Follow-up validator: detect common YouTube URL forms and rewrite to `/embed/…` at create time. Out of scope for 9. |
| RLS policy on the existing `public.user_has_creator_role()` helper doesn't match new tables if creator-role semantics evolve | Low | Re-using the function deliberately; any change propagates to posts + events automatically. |

---

### Follow-ups explicitly deferred

- Supabase Realtime subscription for the feed (live insert).
- Reactions + threads on posts.
- Recurring event series.
- Push notifications / email reminders.
- Per-building in-tavern "stage" sprite (right now the embed is a
  React overlay, not an in-scene object).
- Validation helper that normalises YouTube URLs to `/embed/…`.
