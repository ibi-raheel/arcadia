# Phase 12 Plan: Coworking Productivity (Jukebox + Hourglass + Hearth)

**Goal:** Turn the empty coworking tent into a productivity hub.
Six interactables already drawn into the
`coworkinginside-2508x2508.png` art (jukebox, round table, chest,
bookshelf, easel, sigil banner) become functional surfaces. Each
proximity zone over a fixed PNG coordinate fires an ENTER event;
React overlays open with shared state synced via the existing
Colyseus room.

**Branch:** `feature/coworking-productivity` → PR against `main`.

## Why this scope

Phase 11 closed out the AI sage. Phase 12 is about *why people
return* once the AI gimmick wears off. The coworking grove is the
social-productivity zone — quiet by design, perfect for body
doubling. Three features cover the full ritual: ambient music
(jukebox), shared focus block (hourglass), at-a-glance room read
(hearth pill). The other three objects in the art (bookshelf,
easel, round table) get their own sub-phase 12.B once 12.A proves
people stay.

## Sub-phases — 12.A (this phase)

### 12.A.0 — ADR 0016 + plan

- ADR 0016 — coworking interactables baked into the PNG. Records
  the decision: hand-pick proximity-zone coordinates over fixed
  art positions rather than authoring a Tiled object layer (which
  the legacy world used). Justification: the art is fixed-PNG and
  unlikely to change; over-engineering the coordinate system buys
  nothing.
- This plan + status file.

### 12.A.1 — Coordinates + sprites config

- Hand-pick the six interactable positions in
  `coworkingInsideLayersConfig`. Add a typed `INTERACTABLES` const
  with `{id, label, centerX, centerY, radius}` per slot. Only
  jukebox + chest used by 12.A; round-table / bookshelf / easel /
  banner placeholders for 12.B.
- **Test:** vitest config-shape assertion.

### 12.A.2 — Shared schemas

- `packages/shared/src/schemas/JukeboxState.ts` —
  `{ playlist: string, startedAt: number, volume: number,
    lastChangedBy: string }`.
- `packages/shared/src/schemas/PomodoroState.ts` —
  `{ phase: 'idle' | 'work' | 'break', endsAt: number,
    cycle: number, startedBy: string }`.
- Both attached as `@type` properties on `RealmRoomState`. Empty
  defaults; only set when a tent member writes them.
- **Test:** schema instantiates + serialises through Colyseus
  encoder cleanly.

### 12.A.3 — Server message handlers

- `MSG.SET_JUKEBOX { playlist, volume }` — auth: caller must be
  in the room. Updates state; broadcasts.
- `MSG.START_POMODORO { workMinutes, breakMinutes, cycles }` —
  computes `endsAt`; sets phase='work'; broadcasts.
- `MSG.STOP_POMODORO` — resets phase='idle'.
- Server-side ticker: when `endsAt` passes, flip phase
  (work → break → work) until cycles exhausted.
- **Test:** vitest cases on the handler functions (pure, like
  `applyMove`).

### 12.A.4 — Phaser proximity prompts

- `CoworkingInsideScene` adds two `ProximityPromptManager`s:
  jukebox + chest. Each fires `coworking:open-jukebox` /
  `coworking:open-hourglass` on `this.game.events`.
- Update loop runs them ahead of the archway exit so a single
  ENTER consumes the nearer interactable.
- Bind the overlay-input bridge (same pattern as Sage / FeedScroll).
- **Test:** manual — walk to each, prompt shows, ENTER fires
  the event.

### 12.A.5 — Jukebox React overlay + audio

- New `components/coworking/JukeboxOverlay.tsx` — ScrollCard with
  playlist picker (lo-fi · café · rain · ambient piano), volume
  slider, currently-playing pill, "joined the room's station" hand-
  script line.
- Hidden `<audio>` element plays the selected playlist's MP3 (or a
  YouTube embed) starting at the offset implied by `startedAt`. Fixed
  set of 4 ambient tracks bundled in `public/audio/coworking/`.
- New `components/coworking/CoworkingFeatures.tsx` — listens for
  game events, opens the overlay; mounted in `GameCoworkingInside`.
- Audio per-tab; the *station* is shared via Colyseus state.
- **Test:** open in two tabs → change station in one → other tab's
  station updates. Volume slider doesn't propagate (per-tab user
  preference).

### 12.A.6 — Hourglass overlay + screen-anchored banner

- New `components/coworking/HourglassOverlay.tsx` — proximity
  modal: pre-canned 25/5/25/5/25/15 + custom durations, "join the
  running session" if `endsAt > now`, stop / extend controls for
  the starter.
- New `components/coworking/PomodoroBanner.tsx` — top-centre
  screen-anchored pill. Lantern italic during work, verdigris
  italic during break, hidden during idle. `~ deep work · 18:42 ~`
  countdown ticks every second.
- **Test:** start a session in one tab → other tab's banner
  appears synced. Phase transitions client-side at exactly `endsAt`.

### 12.A.7 — Hearth pill (derived state)

- New `components/coworking/HearthPill.tsx` — top-right
  screen-anchored pill: `~ ironforge · 4 keepers · 3 in flow ~`.
- "In flow" derived from `pomodoroState.phase === 'work'` AND
  member presence (avatars.size).
- Always visible inside coworking-inside scenes.
- **Test:** join → count goes up; start session → "in flow" count
  updates.

### 12.A.8 — Per-creator opt-in

- `creator_preferences` table grows a `coworking_features` jsonb
  column: `{ jukebox: bool, hourglass: bool, hearth: bool }`,
  defaults all-on.
- `CoworkingFeatures.tsx` reads the realm's preferences on mount
  and conditionally mounts each piece.
- Migration `20260425000004_phase12_coworking_features.sql`.
- **Test:** flip jukebox to false in DB; refresh; jukebox prompt
  doesn't appear.

### 12.A.9 — Docs + PR

- `phases/phase-12_status.md` (already started).
- `docs/changelog/2026-04-25_phase-12-coworking-productivity.md`.
- Root README phase line.
- ADR 0016 (already in 12.A.0).
- `apps/web/components/game/scenes/coworking-inside/CLAUDE.md`
  refreshed.

## Sub-phases — 12.B (deferred)

- The bookshelf → tent_bookmarks
- The easel → daily-standup ritual
- The round table → full member-state hub
- Coordinates already reserved in 12.A.1's INTERACTABLES list so
  12.B is a layer-on, not a re-design.

## Test criteria (12.A phase-wide)

1. Two members in the same tent both hear the same playlist after
   one of them changes the station.
2. Pomodoro timer phases (work → break → work) are within 1 s
   across all members in the tent.
3. Hearth pill always shows the tent's accurate occupancy + "in
   flow" count.
4. Jukebox volume is per-member (not shared) so one person can
   mute without affecting others.
5. Per-creator `coworking_features` opt-in works.
6. Five-stage CI green (format / lint / typecheck / vitest /
   `next build`).

## Risks / unknowns

- **Audio licensing.** Need 4 royalty-free ambient tracks. Plan:
  source from FreePD / Pixabay / Bensound under CC0. Bundle in
  `public/audio/coworking/*.mp3`.
- **Server tick precision.** Pomodoro phase transitions need to
  fire at `endsAt`. Use Colyseus's `clock.setInterval` (1 s
  resolution) or compute on read in the client (server stays
  authoritative; clients tick visually).
- **Audio autoplay policy.** Browsers block autoplay until user
  gesture. The overlay's "press play" button handles the first
  unmute; subsequent station changes should propagate.

## Deferred (do not implement in 12)

- Voice rooms / WebRTC.
- Calendar sync (book a focus block in advance).
- Body-double video tiles.
- Achievements / streaks.
