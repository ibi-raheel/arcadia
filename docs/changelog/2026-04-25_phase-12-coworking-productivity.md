# 2026-04-25 · Phase 12.A — coworking productivity (jukebox + hourglass + hearth)

**Branch:** `feature/coworking-productivity` → `main`
**Plan:** `phases/phase-12_plan.md`
**Status:** `phases/phase-12_status.md`
**ADRs:** [0016](../../planning/decisions/0016_2026-04-25_coworking-interactables-baked-in-png.md) — interactables hand-picked over the PNG, not Tiled object layers

The coworking grove gets three productivity surfaces, all wired to
objects already drawn into the tent PNG art (jukebox on the right
wall, wooden chest top-right, sigil banner top-centre).

## What ships

### Jukebox (right-wall PNG element)

- Walk near the glowing teal jukebox → ENTER → React modal opens.
- 4 ambient stations (lo-fi · café · rain · ambient piano).
  Picking one writes `state.jukebox` on the Colyseus room;
  everyone in the same tent hears the same station.
- Per-tab volume slider — saved in localStorage, never synced.
- Hidden `<audio>` element plays `/audio/coworking/<id>.mp3`. The
  MP3 files are NOT bundled — drop CC0 / Pixabay tracks at the
  declared paths to enable playback. Without files, the
  state-sync still works; the audio just stays silent.
- "silence" GhostButton clears the station for the room.

### Hourglass (wooden-chest PNG element)

- Walk near the chest → ENTER → React modal with three Pomodoro
  presets:
  - classic 25 / 5 × 4
  - sprint 50 / 10 × 2
  - deep 90 / 20 × 1
- "Start the block" sends `MSG.START_POMODORO`; the server clock
  ticks every second via `clock.setInterval` and advances phases
  (work → break → work → … → idle) when `endsAt` passes.
- Mid-session, the modal becomes a "session running · stop / back
  to work" panel.
- A **screen-anchored banner** pinned to the top-centre is
  visible whenever a session is running. Lantern italic during
  work phases, verdigris italic during break. Counts down at
  1Hz client-side; server is the source of truth for phase
  transitions.

### Hearth pill (banner-PNG anchor)

- Top-right corner pill, always visible inside a tent. Mirrors
  the location of the sigil banner in the art (which is
  decorative — the pill carries the data).
- `~ N keepers · M in flow · K on break · J idle ~`. "in flow"
  derived from `pomodoro.phase === 'work'` AND member presence;
  per-avatar status is a 12.B feature.

## State sync

A new pair of `Schema` classes — `JukeboxState` + `PomodoroState`
— attach to `RealmRoomState` as nested fields. They sit at empty
defaults in non-coworking rooms (square / tavern); the coworking
clients are the only ones that read them.

**Three new protocol messages** —
`SET_JUKEBOX { playlist }`,
`START_POMODORO { workMinutes?, breakMinutes?, totalCycles? }`,
`STOP_POMODORO {}`. All authority lives server-side
(`apps/game-server/src/rooms/realm-handlers.ts`); pure functions
returned `true | false` for accept / reject. 15 new vitest cases.

**Server tick** — `RealmRoom.onCreate` registers
`this.clock.setInterval(tickPomodoro, 1000)` so the phase machine
advances even when no client sends a message. Cheap (only mutates
when something is due) and Colyseus only re-broadcasts on diff.

## Coordinates (ADR 0016)

Six interactables baked into the tent PNG; two active in 12.A.
Coordinates eyeballed against `coworkinginside-2508x2508.png` and
stored as `COWORKING_INTERACTABLES` in
`coworking-inside/layers.config.ts`. The other four (round table,
bookshelf, easel, banner) carry placeholder coords ready for 12.B.

ADR 0016 captures why these are typed consts, not a Tiled object
layer: the art is a fixed hand-painted PNG, the interactables
aren't moving, and every other image-backed scene already follows
this pattern.

## Files added

- `packages/shared/src/schemas/JukeboxState.ts`
- `packages/shared/src/schemas/PomodoroState.ts`
- `apps/game-server/src/rooms/realm-handlers.ts` — 4 new pure
  helpers + 15 vitest cases
- `apps/web/components/coworking/CoworkingFeatures.tsx`
- `apps/web/components/coworking/JukeboxOverlay.tsx`
- `apps/web/components/coworking/JukeboxAudio.tsx`
- `apps/web/components/coworking/HourglassOverlay.tsx`
- `apps/web/components/coworking/PomodoroBanner.tsx`
- `apps/web/components/coworking/HearthPill.tsx`
- `apps/web/components/coworking/playlists.ts`
- `phases/phase-12_plan.md`
- `phases/phase-12_status.md`
- `planning/decisions/0016_2026-04-25_coworking-interactables-baked-in-png.md`
- This changelog

## Files modified

- `packages/shared/src/schemas/RealmRoomState.ts` — adds
  `jukebox` + `pomodoro` nested schemas
- `packages/shared/src/protocol/messages.ts` — adds 3 new MSG ids
  + payload types
- `packages/shared/src/index.ts` — re-exports the new schemas +
  payload types
- `apps/game-server/src/rooms/RealmRoom.ts` — registers handlers
  + clock ticker
- `apps/web/components/game/scenes/coworking-inside/CoworkingInsideScene.ts`
  — proximity prompts + overlay-input bridge + event-emit
- `apps/web/components/game/scenes/coworking-inside/layers.config.ts`
  — `COWORKING_INTERACTABLES` const
- `apps/web/components/game/GameCoworkingInside.tsx` — mounts
  `CoworkingFeatures` next to `LevelUpBanner`

## Commits

- `feat(phase12.0): plan + ADR 0016 — coworking productivity`
- `feat(phase12.1-3): coordinates + shared schemas + server handlers`
- `feat(phase12.4-7): coworking jukebox + hourglass + hearth pill`
- `docs(phase12.9): plan + status + changelog closeout`

## Before this PR merges

- **No new env vars.** Reuses the Colyseus connection.
- **No DB migrations.** All shared state lives on the Colyseus
  room (in-memory, per-tent shard).
- **MP3 files** — `public/audio/coworking/*.mp3` is empty. Drop
  CC0 ambient tracks (Pixabay / FreePD work) at:
  - `lofi.mp3`
  - `cafe.mp3`
  - `rain.mp3`
  - `ambient-piano.mp3`
  Once dropped, `JukeboxAudio` plays them automatically — no
  code change.

## 12.A polish (same-day follow-ups, PRs #22 + #23)

- **Volume slider was inert.** JukeboxOverlay held local volume
  state; JukeboxAudio sibling never re-rendered when the slider
  moved. Lifted volume into CoworkingFeatures as shared state;
  slider now drives audio in real time.
- **"What I'm working on" focus line.** Top-left screen-anchored
  `FocusPill` lets the keeper write a short focus string. New
  `MSG.SET_FOCUS` + `currentFocus` field on `AvatarState`; renders
  above the avatar's nameplate via `setVisualsFocus`. Per-avatar
  (not per-tent) — focus follows the keeper between scenes.
- **Audio shipped.** Four Bensound tracks at
  `public/audio/coworking/{lofi,cafe,rain,ambient-piano}.mp3`
  with `ATTRIBUTION.md` documenting sources + the swap-to-CC0
  path.

## 12.B (deferred)

Three more PNG objects already have coordinates reserved:

- **Bookshelf** (top-left) → tent_bookmarks (Supabase persistence)
- **Easel** (right edge) → daily-standup ritual (post to feed)
- **Round table** (centre) → full member-state hub
- **Per-avatar status** field (`currentFocus`) on `AvatarState`
  so HearthPill counts can be per-avatar, not derived from a
  global pomodoro phase
- Per-creator `coworking_features` opt-in
