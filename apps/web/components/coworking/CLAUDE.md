# components/coworking

React overlays for the coworking tents (Phase 12). Mounted by
`GameCoworkingInside.tsx` next to `LevelUpBanner`. Driven by:

- Phaser proximity prompts in `CoworkingInsideScene.ts` →
  `game.events.emit('coworking:open-<thing>')`
- Per-tent state on the Colyseus room
  (`state.jukebox` / `state.pomodoro`)
- Per-avatar focus state (`AvatarState.currentFocus`)

## Files

- `CoworkingFeatures.tsx` — top-level. Listens for the two ENTER
  events, subscribes to `room.onStateChange` (catch-all so nested
  Schema diffs reach React), lifts everything to React state,
  mounts the six surfaces below. **Owns the volume slider state**
  — passes value + setter down to JukeboxOverlay (slider) and
  value down to JukeboxAudio (audio element). Earlier shape had
  the slider's state local to the overlay; both components now
  read the same source.
- `JukeboxOverlay.tsx` — proximity modal. Station picker (4
  cards), volume slider, "currently playing" pill, "silence" +
  "done" buttons. `MSG.SET_JUKEBOX` on station change.
- `JukeboxAudio.tsx` — hidden `<audio>` element keyed on the
  current playlist. Volume from props (real-time updates).
  Browser autoplay policy means the first track on a fresh tab
  needs a click to start (the station-pick click counts).
- `HourglassOverlay.tsx` — Pomodoro modal. Three presets
  (`classic 25/5×4`, `sprint 50/10×2`, `deep 90/20×1`) + a
  running-session view with stop / back-to-work. `MSG.START_
  POMODORO` / `MSG.STOP_POMODORO`.
- `PomodoroBanner.tsx` — top-centre screen pill. Hidden when
  `phase === 'idle'`. Lantern italic during work, verdigris
  italic during break. Counts down at 1 Hz client-side; server
  is the source of truth for phase transitions.
- `HearthPill.tsx` — top-right screen pill. `~ N keepers · M in
  flow · K on break ~`. Always visible inside a tent.
- `FocusPill.tsx` — top-left screen pill. Empty state shows
  hand-script "what are you working on?"; with a value, "◈ <focus>"
  in lantern italic. Click to expand into an editor (text +
  ENTER → save, Esc → cancel, ✕ → clear). Sends `MSG.SET_FOCUS`.
- `playlists.ts` — typed station descriptors + `findPlaylist`.
- `public/audio/coworking/*.mp3` — four Bensound tracks (free
  with attribution; see `ATTRIBUTION.md` in that folder).

## Pill positioning (post-Phase-14)

All three coworking pills are anchored to the viewport at
`top: 80` (z-index 70) so the global player HUD bar at the top
of the viewport sits clear above them. Earlier draft used
`top: 16`; bumped during Phase 14 polish (PRs #29 + #32).

| Pill              | top  | left/right          |
|-------------------|------|---------------------|
| `FocusPill`       | 80   | left: 16            |
| `PomodoroBanner`  | 80   | left: 50% (centred) |
| `HearthPill`      | 80   | right: 16           |

If the HUD bar height ever changes materially, re-tune these
together.

## State sync

`room.onStateChange(readAll)` is the single subscription —
fires on every server diff, no schema-callback acrobatics for
the nested fields. `readAll` re-reads:

- `state.jukebox.{playlist, startedAt, lastChangedBy}`
- `state.pomodoro.{phase, endsAt, cycle, totalCycles, startedBy}`
- `state.avatars.size` (for `HearthPill`)
- `state.avatars.get(sessionId).currentFocus` (for `FocusPill` +
  the local avatar's nameplate)

Local-focus changes also dispatch a `arcadia:local-focus-changed`
window CustomEvent that the Phaser scene picks up to update the
local avatar's nameplate (the local avatar isn't in its own
state-subscription path, so this bridge is needed).

## Volume

Per-member, not synced. Lives in `localStorage` under
`arcadia.jukebox.volume`. CoworkingFeatures hydrates on mount,
exposes a `setVolume` setter, persists to localStorage on every
change. Both the slider and the audio element read it from props.

## Server contract (apps/game-server)

- `MSG.SET_JUKEBOX { playlist }` — empty string clears.
- `MSG.START_POMODORO { workMinutes?, breakMinutes?, totalCycles? }` —
  refused if a session is already running. Defaults backfilled,
  out-of-range values clamped.
- `MSG.STOP_POMODORO` — hard-resets to idle.
- `MSG.SET_FOCUS { text }` — 60-char cap server-side. Empty
  clears. Per-avatar (writes to caller's session's avatar).
- Server tick — `clock.setInterval(tickPomodoro, 1000)` advances
  phases (work → break → … → idle).

All four handlers in `apps/game-server/src/rooms/realm-handlers.ts`
are pure functions returning `boolean` (accept / reject) — unit-
tested in `__tests__/realm-handlers.test.ts` (15 Phase-12 cases).

## Why custom events for cross-boundary stuff

The pattern across the app: Phaser scene fires events on
`game.events`; React listens via `gameRef.current.events.on`.
For overlay-input focus → Phaser keyboard release we use a
`window.dispatchEvent` instead, because the bridge target is the
*scene*, not React, and the React side doesn't have a direct
handle to the scene. Same window-event pattern is used by
`arcadia:local-focus-changed` → `localAvatar.setFocus`.

See `apps/web/components/game/CLAUDE.md` § "React overlays driven
by Phaser events" for the full table.
