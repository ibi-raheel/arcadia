# Phase 14 — Persistent player HUD (shield + name + XP + menu icons)

**Date:** 2026-04-25
**Branch:** `feature/player-hud` (initial ship: PR #29) + four polish PRs (#30 → #33), all merged to `main` 2026-04-25.
**ADRs:** [0018](../../planning/decisions/0018_2026-04-25_player-hud-9-slice.md) (Kenney 9-slice + SVG shield)

## What shipped (final state, after #29 + #30 + #31 + #32 + #33)

A **single full-width HUD bar** at the top of every Phaser-backed
scene. Lives in the page's flex flow (not a fixed overlay) so the
Phaser canvas is constrained to the area below it — world art and
the avatar can't render behind the HUD.

Left → right inside the bar:

- **Heraldic SVG shield** with the player's level number centred.
  No "Lvl" text — the shape signals what it is. Anchors the left
  end where the original two-corner layout had a circular avatar
  portrait (the avatar circle was removed in PR #30).
- **Display name** in IM Fell English Italic.
- **XP progress bar** — fills bronze→gilt to the ratio of XP earned
  within the current level → next level threshold.
- **Four placeholder menu icons** — Profile / Quests / Events /
  Settings — as filled SVG silhouettes (no surrounding button
  frame).

The bar uses Kenney "Fantasy UI Borders" v1.0 (CC0), one PNG
(`panel-bronze.png`) as a 9-sliced `border-image` over a dark
brown CSS-token fill (`--ink` at 85% alpha — the same near-black
brown the creator dashboards sit on). The PNG ornaments were
recoloured cream → bronze in PR #32 via a one-off Node script
(`scripts/tint-panel.mjs`) so the rim reads warm with the HUD
instead of cold-white over it. Border-width is 6 px (was 12 px,
trimmed in PR #33 so the rim is delicate, not a wall).

**Layering:** the bar lives in flex flow, not at `position: fixed`.
Modal overlays at z-index 80+ (SageDialogue, JukeboxOverlay,
HourglassOverlay) still cover the whole viewport including the
bar — modals continue to obscure the HUD as Phase 14 spec asked.

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
  (~150 bytes), 9-sliced via `border-image` on `.hud-panel`. The
  active variant is `panel-bronze.png` — original ornaments were
  cream and recoloured via `scripts/tint-panel.mjs` (PR #32).
- **Dark brown fill from CSS tokens**, not baked into the PNG.
  Re-skinning is one variable change, not an asset re-export.
- **Inline SVG shield + filled SVG menu icons**, not PNGs.
  Themeable via CSS variables, crisp at every zoom, no asset
  license bookkeeping.
- **`xp` not added to Colyseus `AvatarState`** — no other client in
  the room reads it, so broadcasting is wasted bandwidth. If a use
  case appears (in-room leaderboards?), promote then.

## Conflict resolution: coworking pills

The coworking-inside scene already had three top-anchored pills:
`HearthPill` (top-right, room occupancy), `FocusPill` (top-left,
"what I'm working on"), and `PomodoroBanner` (top-centre, only
visible while a pomodoro is running). All three got bumped from
`top: 16` → `top: 80` so the new global HUD sits clear above them.
Same z-index (70), same modal-obscuration behaviour.

## Polish trail (PR #30 → #33, all merged 2026-04-25)

The initial ship in PR #29 used a **two-corner layout** with
`AvatarBadge` (top-left) + `XPLevelBadge` (top-right) both at
`position: fixed`. Four polish PRs reshaped it into the final
single-bar form:

- **PR #30 — `feat(hud): consolidate into one full-width bar`** —
  Replaced the two-corner layout with a single full-width
  `PlayerBar`. New `MenuIcons.tsx` (Profile/Quests/Events/Settings)
  ride along on the right. Avatar circle removed; the shield now
  anchors the left end. Brown panel introduced. Deleted
  `AvatarBadge.tsx` + `XPLevelBadge.tsx`.
- **PR #31 — `fix(hud): dark dashboard brown panel + frameless
  filled icons`** — bg switched to `--ink` (#140a05) at 85% alpha
  (the dashboard brown). Icon button frames stripped; SVGs redrawn
  as filled silhouettes (was: outlines).
- **PR #32 — `fix(hud): bronze border + flush layout (no overlay)`** —
  Wrote `scripts/tint-panel.mjs` (one-off pngjs) recolouring the
  Kenney panel ornaments cream → bronze (`--bronze-bright`). New
  `panel-bronze.png` checked in. Removed screen-edge padding (bar
  flush across the top). **Restructured each `Game*` page from
  `relative` outer → `flex flex-col`** — the HUD takes auto height
  as the first flex child, the Phaser canvas claims `flex-1`. The
  bar is no longer a `position: fixed` overlay; world art and the
  avatar can no longer render behind it. PomodoroBanner bumped
  16 → 80.
- **PR #33 — `fix(hud): thinner bronze rim + larger menu icons`** —
  `border-image-width` 12 → 6 (delicate rim, not a wall); icon
  button 32 → 40, glyph 22 → 28.

## Files added (final state)

- `apps/web/components/hud/PlayerHud.tsx` — orchestrator + Realtime
  XP subscription.
- `apps/web/components/hud/PlayerBar.tsx` — the in-flow flex bar
  rendering Shield + name + XP + MenuIcons (PR #30).
- `apps/web/components/hud/MenuIcons.tsx` — four filled SVG icons
  (PR #30 + #31 + #33).
- `apps/web/components/hud/Shield.tsx` — inline SVG heraldic shield.
- `apps/web/components/hud/panel.css` — `.hud-panel` border-image
  rules + `.hud-xp-track` / `.hud-xp-fill` / `.hud-icon-btn`.
- `apps/web/public/hud/kenney/panel-bronze.png` — bronze-tinted
  panel (PR #32, the live variant).
- `apps/web/public/hud/kenney/{panel,panel-002,border,divider}.png` —
  original Kenney subset (#29, retained for reference).
- `apps/web/public/hud/kenney/{LICENSE,ATTRIBUTION}.{txt,md}`.
- `scripts/tint-panel.mjs` — one-off pngjs recolour script (PR #32).

## Files removed

- `apps/web/components/hud/AvatarBadge.tsx` — deleted in PR #30.
- `apps/web/components/hud/XPLevelBadge.tsx` — deleted in PR #30.

## Files changed

- `packages/shared/src/gamification/levels.ts` — new
  `progressToNextLevel(xp)` helper + `LevelProgress` type. 7 new
  vitest cases (29 total in that file, was 22).
- `packages/shared/src/index.ts` — re-export the helper + type.
- `apps/web/components/game/scenes/world/WorldScene.ts` —
  `SceneMember` gets `xp: number`.
- `apps/web/components/game/Game{Square,CoworkingInside,Outdoor,Tavern,World}.tsx` —
  `fetchSession` extended to read `memberships.xp`; HUD mounted;
  outer container restructured to `flex flex-col` with the canvas
  in a `relative flex-1` child (PR #32).
- `apps/web/app/{academy,market}/page.tsx` — same `xp` extension
  on the SSR fetch.
- `apps/web/components/coworking/{HearthPill,FocusPill,PomodoroBanner}.tsx` —
  all three bumped to `top: 80` (HearthPill + FocusPill in #29,
  PomodoroBanner in #32).
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
