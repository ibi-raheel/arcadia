# Phase 14 — Persistent player HUD (avatar + name + XP + level)

**Date:** 2026-04-25
**Branch:** `feature/player-hud` → PR (TBD) → `main`
**ADRs:** [0018](../../planning/decisions/0018_2026-04-25_player-hud-9-slice.md) (Kenney 9-slice + SVG shield)

## What shipped

A persistent in-game HUD overlay anchored to the screen corners while
the player is in any Phaser-backed scene:

- **Top-left — `AvatarBadge`** — circular avatar portrait + display
  name. Portrait is the top-left frame from the avatar's `idle.png`
  (avatars 01 + 02 ship with sprites; 03–08 fall back to the
  `AVATAR_COLORS` palette).
- **Top-right — `XPLevelBadge`** — XP progress bar (filled to the
  ratio of XP earned within the current level → next level
  threshold) + a heraldic SVG shield with the level number centred.
  No "Lvl" text; the shape signals what it is.

Both panels are 9-sliced from a single Kenney "Fantasy UI Borders"
PNG (CC0). Z-index 70 — below modals at 80, so the Sage popup,
jukebox overlay, hourglass overlay, and any future dashboard view
obscure the HUD exactly as Phase 14 spec asked.

Mounted in:

- `GameSquare` (`/world`)
- `GameCoworkingInside` (`/coworking/inside`)
- `GameOutdoor` (`/academy-outside`, `/tavern-outside`,
  `/coworking-outside`)
- `GameTavern` (`/tavern`)

## How it stays in sync

`PlayerHud` subscribes to the local member's `memberships` row via
Supabase Realtime. When the lesson-completion trigger updates `xp`
server-side, the new value lands in the HUD within one Realtime tick
and the bar slides over 600 ms to its new percentage. The level
shield re-renders if the new XP crosses a threshold.

## Why no migration

Server schema unchanged. The `memberships.xp` column has been there
since `20260422000002_phase5_gamification.sql` — the HUD was just
not reading it. The Phase-14 work extends the existing
`select(...)` clauses in seven `fetchSession` callsites to include
`xp` and adds a single new field to `SceneMember` (`xp: number`).

## Rendering choices (ADR 0018)

- **Kenney panel**, not hand-drawn CSS ornaments. Single 48×48 PNG
  (~150 bytes), 9-sliced via `border-image` on `.hud-panel`.
- **Dark navy fill from CSS tokens**, not baked into the PNG.
  Re-skinning is one variable change, not an asset re-export.
- **Inline SVG shield**, not a heraldic-shield PNG. Themeable via
  CSS variables, crisp at every zoom, no asset license bookkeeping.
- **Avatar portrait cropped from idle.png** at runtime via
  `background-position`, not a separate `portrait.png` asset.
  Sprites + portraits stay in lock-step automatically.
- **`xp` not added to Colyseus `AvatarState`** — no other client in
  the room reads it, so broadcasting is wasted bandwidth. If a use
  case appears (in-room leaderboards?), promote then.

## Conflict resolution: coworking pills

The coworking-inside scene already had two corner pills:
`HearthPill` (top-right, room occupancy) and `FocusPill` (top-left,
"what I'm working on"). Both got bumped from `top: 16` → `top: 80`
so the new global HUD sits clear above them. Same z-index (70),
same modal-obscuration behaviour.

`PomodoroBanner` (top-centre) is unaffected.

## Files added

- `apps/web/components/hud/PlayerHud.tsx`
- `apps/web/components/hud/AvatarBadge.tsx`
- `apps/web/components/hud/XPLevelBadge.tsx`
- `apps/web/components/hud/Shield.tsx`
- `apps/web/components/hud/panel.css`
- `apps/web/public/hud/kenney/{panel,panel-002,border,divider}.png`
- `apps/web/public/hud/kenney/{LICENSE,ATTRIBUTION}.{txt,md}`

## Files changed

- `packages/shared/src/gamification/levels.ts` — new
  `progressToNextLevel(xp)` helper + `LevelProgress` type. 7 new
  vitest cases (29 total in that file, was 22).
- `packages/shared/src/index.ts` — re-export the helper + type.
- `apps/web/components/game/scenes/world/WorldScene.ts` —
  `SceneMember` gets `xp: number`.
- `apps/web/components/game/Game{Square,CoworkingInside,Outdoor,Tavern,World}.tsx` —
  `fetchSession` extended to read `memberships.xp`; HUD mounted.
- `apps/web/app/{academy,market}/page.tsx` — same `xp` extension
  on the SSR fetch.
- `apps/web/components/coworking/{HearthPill,FocusPill}.tsx` —
  bumped to `top: 80`.
- `apps/web/public/CLAUDE.md` — registered the new `hud/`
  category per its own drift rules.

## Tests + verification

Local runs:

- `npm run format:check` — clean.
- `npm run lint` — clean (`--max-warnings=0`).
- `npm run typecheck` — clean.
- `npm run test` — 320 passing (was 313; +7 from new
  `progressToNextLevel` cases).
- `next build` — production compile succeeded.

Visual verification deferred to user (no browser MCP available in
this session): boot `/world`, confirm the HUD lands top-left + top-
right; navigate to `/coworking/inside`, confirm the HearthPill +
FocusPill sit BELOW the HUD without overlap; open the Sage popup,
confirm it covers the HUD; navigate to `/academy-outside`, confirm
the HUD persists.
