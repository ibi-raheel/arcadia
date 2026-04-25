# Phase 14 — Status

Source plan: `phase-14_plan.md`. Entries chronological, newest on top.

## 2026-04-25 — 14.5 · post-ship polish (PR #30 → #33 trail)

After the initial PR #29 ship, four polish PRs reshaped the HUD
based on user feedback. Consolidated entry rather than four
separate ones because they all landed within an hour:

- **PR #30 — `feat(hud): consolidate into one full-width bar`** —
  replaced the two-corner layout (`AvatarBadge` + `XPLevelBadge`)
  with a single full-width `PlayerBar.tsx`. The avatar circle was
  removed; the shield anchors the left end now. New
  `MenuIcons.tsx` rides along on the right with four placeholder
  SVG buttons (Profile / Quests / Events / Settings). Deleted
  `AvatarBadge.tsx` and `XPLevelBadge.tsx`. Brown panel introduced.
- **PR #31 — `fix(hud): dark dashboard brown panel + frameless
  filled icons`** — bg → `--ink` (#140a05) at 85% alpha (the same
  near-black brown the creator dashboards use). Icon button
  frames stripped (no border, no bg, no radius). Glyphs redrawn
  as filled silhouettes (was: stroke outlines).
- **PR #32 — `fix(hud): bronze border + flush layout`** — wrote
  `scripts/tint-panel.mjs` (one-off pngjs script) recolouring the
  Kenney panel ornaments cream → bronze. New `panel-bronze.png`
  checked into `apps/web/public/hud/kenney/`. Removed screen-edge
  padding (`top:12 left:12 right:12` → flush). **Restructured each
  Game* page from `relative` outer → `flex flex-col`**: the HUD
  now lives in flex flow (not `position: fixed`) and the Phaser
  canvas is constrained to a `relative flex-1` child below it. The
  avatar can no longer render behind the bar. PomodoroBanner
  bumped from `top: 16` → `top: 80` to clear the bar (HearthPill
  + FocusPill already there from #29).
- **PR #33 — `fix(hud): thinner bronze rim + larger menu icons`** —
  `border-image-width` 12 → 6 (delicate frame, not a wall); icon
  button 32 → 40, glyph 22 → 28.

All four CI green on every merge. No phase 14 sub-phase reopened
— this is post-ship polish on the same feature.

## 2026-04-25 — 14.4 · docs (changelog + README + phase-plan + CLAUDE.md routing)

- New `docs/changelog/2026-04-25_phase-14-player-hud.md` with full
  ship report.
- README: intro line bumped seven → eight extension phases; Phase
  14 entry added to recent activity; exit-logs row gets `· [Phase
  14]`.
- `docs/mvp/phase-plan.md` banner: Phase 14 bullet added; "seven"
  → "eight".
- `CLAUDE.md`: naming-convention bullet bumped to 06–14; new
  routing-table row for `/apps/web/components/hud/`.
- `phases/phase-14_status.md`: 14.1 → 14.4 entries.

## 2026-04-25 — 14.3 · mounted PlayerHud across game pages

- `<PlayerHud />` mounted in GameSquare, GameCoworkingInside,
  GameOutdoor, GameTavern (under `fetchState.status === 'ready'`
  guard).
- HearthPill + FocusPill bumped from `top: 16` → `top: 80` so the
  global HUD sits clear above them inside the coworking tent.
- All four CI stages green (320 / 343 passing); `next build`
  green.

## 2026-04-25 — 14.2 · PlayerHud component

- New `apps/web/components/hud/`:
  - `PlayerHud.tsx` — orchestrator + Realtime memberships UPDATE
    subscription.
  - `AvatarBadge.tsx` — top-left, Kenney 9-slice panel + circular
    portrait + display name.
  - `XPLevelBadge.tsx` — top-right, panel + XP track + Shield.
  - `Shield.tsx` — inline SVG heraldic shield with level number.
  - `panel.css` — `.hud-panel` border-image, `.hud-xp-track` /
    `.hud-xp-fill`, `.hud-avatar-circle`. `image-rendering:
    pixelated` on the panel, `auto` on children.
- `packages/shared/src/index.ts` re-exports `progressToNextLevel`
  + `LevelProgress`.

## 2026-04-25 — 14.1 · progressToNextLevel + xp in fetchSession

- `progressToNextLevel(xp)` added to
  `packages/shared/src/gamification/levels.ts`. 7 new vitest cases
  (29 total in that file).
- `SceneMember` (in `WorldScene.ts`) gains `xp: number`. All seven
  construction sites updated:
  GameSquare / GameCoworkingInside / GameOutdoor / GameTavern /
  GameWorld + the SSR `app/{academy,market}/page.tsx`.

## 2026-04-25 — Phase 14 opened (14.0 · plan + ADR + asset ingest)

Branch `feature/player-hud` cut from `main`. Plan + status files in
place. ADR 0018 captures the three rendering choices (Kenney 9-slice
panels, CSS-token fill, SVG shield over PNG asset) + the alternative
considered (adding `xp` to AvatarState — rejected for now since no
other client reads it). Subset of Kenney's "Fantasy UI Borders" v1.0
(CC0) checked in at `apps/web/public/hud/kenney/` — 4 PNGs + license
+ attribution. `apps/web/public/CLAUDE.md` updated to register the
new `hud/` category per its drift rules. Sub-phase ritual from
CLAUDE.md applies; this feature opted into autonomous mode (no per-
sub-phase review, commits + log entries continue).
