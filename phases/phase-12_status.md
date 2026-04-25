# Phase 12 — Status

Source plan: `phase-12_plan.md`. Entries chronological, newest on top.

## 2026-04-25 — 12.A polish · volume slider + focus pill

Two follow-ups after the user's first session in the tent:

- **Volume slider was inert.** Was: JukeboxOverlay held local
  volume state; JukeboxAudio sibling read localStorage on render
  and never re-rendered when the slider moved. Fix: lifted volume
  into CoworkingFeatures, passed down to both. Slider now updates
  audio in real time. (PR #23, commit `e918113`.)
- **"What I'm working on" focus line shipped.** Top-left
  screen-anchored pill (`FocusPill.tsx`). New `MSG.SET_FOCUS`
  message + `currentFocus` field on `AvatarState`. Renders above
  the nameplate (`avatar-renderer.ts` grew a second text label +
  `setVisualsFocus` helper). Per-avatar, not per-tent — focus
  follows you between scenes.
- **Audio shipped too.** Four ambient MP3s at
  `public/audio/coworking/{lofi,cafe,rain,ambient-piano}.mp3`
  sourced from Bensound (free w/ attribution; ATTRIBUTION.md
  documents sources + the swap-to-CC0 path).

## 2026-04-25 — 12.A.4–7 · client UI landed

- CoworkingInsideScene: proximity prompts at jukebox + chest.
  ENTER fires `COWORKING_OPEN_JUKEBOX_EVENT` /
  `COWORKING_OPEN_HOURGLASS_EVENT` on `game.events`. Overlay-input
  bridge attached for WASD / SPACE / ENTER inside dialogs.
- `CoworkingFeatures.tsx` subscribes to `state.jukebox` +
  `state.pomodoro` + `state.avatars.size` via `getStateCallbacks`;
  lifts to React state, mounts four surfaces.
- `JukeboxOverlay` + `JukeboxAudio` (4 stations, per-tab volume,
  shared `startedAt` offset). MP3 files at
  `public/audio/coworking/*.mp3` are NOT committed
  (royalty-free sourcing follow-up); UI works without them.
- `HourglassOverlay` (3 presets + stop) + `PomodoroBanner`
  (top-centre, lantern → verdigris on phase change).
- `HearthPill` top-right (always visible in tent).
- Mounted in `GameCoworkingInside`. All four CI stages + `next
  build` green.

## 2026-04-25 — 12.A.1–3 · schemas + server handlers landed

- `COWORKING_INTERACTABLES` typed const in `layers.config.ts` (six
  positions, two active in 12.A).
- `shared/schemas/JukeboxState` + `PomodoroState` + protocol
  message types (`SET_JUKEBOX` / `START_POMODORO` /
  `STOP_POMODORO`).
- `realm-handlers.ts`: `applySetJukebox`, `applyStartPomodoro`,
  `applyStopPomodoro`, `tickPomodoro` (pure phase-machine).
- `RealmRoom` registers 3 handlers + 1Hz `clock.setInterval`
  ticker.
- 15 new vitest cases on the handler functions; 37 server tests
  total, all green.

## 2026-04-25 — 12.A.0 · plan + ADR

- Phase 12 plan + status files.
- ADR 0016 — coworking interactables baked into the PNG (typed
  consts vs Tiled object layers).

## 2026-04-25 — Phase 12 opened

Branch `feature/coworking-productivity` cut from `main`. Plan +
status files in place. Sub-phase ritual from CLAUDE.md applies.
12.A scope: jukebox + hourglass + hearth pill. 12.B
(bookshelf / easel / round-table) deferred until 12.A proves
people stay.
