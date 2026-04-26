# ADR 0018 — Persistent player HUD: Kenney 9-slice borders + SVG shield

**Date:** 2026-04-25
**Status:** Accepted
**Related:** Phase 14 plan, ADR 0009 (design-system tokens own colour), ADR 0016 (interactables baked in PNG — same "art-on-disk, behaviour-in-React" pattern)

## Context

Phase 14 adds a persistent in-game HUD: top-left circular avatar
portrait + display name; top-right XP progress bar + level shield.
The HUD must be visible across every Phaser scene (`/world`,
`/coworking/inside`, the three `*-outside` neighbours, `/tavern`)
and obscured by modals (Sage popup, jukebox overlay, etc.).

Three asset/rendering choices need recording:

1. **Frame style.** Hand-drawing fantasy-style ornament frames in
   CSS is fiddly and inconsistent. The user supplied Kenney's
   "Fantasy UI Borders" pack (CC0). Twelve panel variants would
   match the visual target; we use one.

2. **9-slice mechanics.** Kenney panels are 48×48 PNGs with
   transparent middles and 1–3 px corner ornaments. They are
   designed to be 9-sliced via CSS `border-image` so a single PNG
   serves any rectangle size.

3. **Level shield.** A heraldic shield shape is **not** in the
   Kenney pack — the pack is rectangles + circles only. We need
   something distinct from the rectangular XP panel so the level
   reads as a separate "badge."

## Decision

**Frame style:** Kenney "Fantasy UI Borders" v1.0, `panel-001.png`
variant (corner-cross ornament). Subset checked in at
`apps/web/public/hud/kenney/` (4 PNGs + license + attribution),
not the full 140-file pack. Additional variants imported only when
actually used.

**Render path:** CSS `border-image` against `panel.png`. Background
fill is a CSS variable from the existing midnight-scriptorium token
set (`--night` / `--ink-deep`), **not** baked into the PNG. This
keeps the dark navy in lock-step with the rest of the design system
and lets us re-skin without re-exporting art.

**Pixel-art crispness:** `image-rendering: pixelated` on the panel
elements. The Kenney pack is pixel-art; default browser scaling
would blur the ornaments.

**Level shield:** Inline SVG (not PNG, not asset). A simple
heraldic shield path (~10 lines) drawn in the existing palette
(`--bronze` outline, `--ink-deep` fill, `--gilt` accent for the
level number). Reasons for SVG over a new PNG:
- Crisp at every zoom level without `image-rendering` hacks.
- Themeable via CSS variables (same colours as the rest of the
  HUD; future re-skins are one token swap).
- One file, no upload/license bookkeeping.
- Trivially recoloured for level milestones (e.g. tint at L10,
  L20).

**Avatar portrait:** Crop the top-left frame from the existing
`public/avatars/<id>/idle.png` sheet at runtime (`background-image`
+ `background-position` on a circular `clip-path` div). No new
asset needed; portraits stay in lock-step with sprite art when an
avatar's body changes.

## Consequences

**Good:**
- One ornament style across the entire HUD; consistent visual
  language with the existing midnight-scriptorium UI.
- Single 48×48 PNG (~150 bytes) handles every panel size.
- Re-skinning the HUD is changing CSS tokens, not exporting art.
- The level shield doesn't fight the panel ornaments — different
  shape (shield) signals different meaning (status badge).
- No new asset license bookkeeping for the shield.

**Bad:**
- `border-image-slice` browser quirks exist in older browsers but
  are fine in everything Next 14 targets.
- The corner-cross style is locked in; changing it later means
  swapping `panel.png` (one file) plus visual review.
- The SVG shield is hand-drawn pixels (literally a path I wrote);
  if a brand-design pass later wants a richer crest, it gets
  replaced with an asset.

**Neutral:**
- We import only 4 of 140 PNGs from the Kenney pack. If we need
  more variants, the workflow is in `public/CLAUDE.md` (and in the
  attribution file).

## Alternatives considered

1. **Generate the frame entirely in CSS** (gradients + pseudo-
   elements for corner ornaments). Possible, but the ornament
   shapes are non-trivial; a pixel-art PNG is cleaner and matches
   the established midnight-scriptorium "art-on-disk, behaviour-
   in-React" pattern (ADR 0016).

2. **Render the HUD inside Phaser** (as a fixed-camera GameObject).
   Rejected: the HUD needs to be obscured by React modals; living
   in Phaser would require z-index gymnastics on the canvas itself
   and break with `JukeboxOverlay`-style fullscreen overlays.

3. **Ship a heraldic-shield PNG asset.** Rejected: no good free
   asset matches our palette; making one ourselves duplicates
   what an SVG path does in 10 lines.

4. **Add `xp` to the Colyseus `AvatarState` schema** so the bar
   syncs through the room. Rejected for now — XP is not used by
   any other client in the room (Sage / jukebox / pomodoro don't
   read XP), so adding it would mean broadcasting an extra field
   to every member for nobody's benefit. Phase 14 fetches XP from
   Supabase and listens to Realtime memberships UPDATE; if a use
   case for shared XP appears (leaderboards in-room?) we'll
   promote it to AvatarState then.

## Implementation

Tracked under Phase 14 (`phases/phase-14_plan.md`). Four sub-
phases: 14.0 plan + ADR + asset ingest, 14.1 shared progress
helper + extended fetchSession, 14.2 PlayerHud component, 14.3
mount across game pages, 14.4 docs.

**14.5 — Post-ship polish (PR #30 → #45, all 2026-04-25).** The
initial ship used a two-corner layout (`AvatarBadge` top-left +
`XPLevelBadge` top-right) and `position: fixed`. After the user
saw it in-world, twelve polish PRs reshaped the design (counting
doc sweeps and one short-lived intermediate) without re-opening
any sub-phase:

- The two-corner panels were consolidated into one full-width
  `PlayerBar` with the shield as the left anchor (avatar circle
  removed). Five placeholder menu icons (Profile / Chat / Quests
  / Events / Settings) ride along on the right.
- The panel bg moved from dark navy to `--ink` at 85% alpha
  (the dashboard brown).
- The Kenney panel ornaments were recoloured cream → bronze via
  `scripts/tint-panel.mjs` (one-off pngjs script, output at
  `apps/web/public/hud/kenney/panel-bronze.png`). The script
  accepts an optional alpha-multiplier argument; currently
  shipping with `0.55` so the rim reads as a delicate frame.
- The bar moved out of `position: fixed` into the page's flex
  flow — each `Game*` page is now `flex flex-col` with the HUD
  as the first child and the Phaser canvas in a `relative
  flex-1` child below. World art can no longer render behind
  the bar.
- `border-image-width` trimmed 12 → 6 (delicate frame, not a
  wall); icon button 32 → 40, glyph 22 → 28.
- `PlayerBar` + `PlayerHud` gained a `loaded?: boolean` prop
  (default `true`); each `Game*` page passes
  `loaded={sceneReady}`. When false, the bar reserves layout
  space but renders `visibility: hidden` — the HUD stays
  invisible during scene preload, and there's no Phaser canvas
  resize when it appears post-preload.
- The coworking pills (`HearthPill`, `FocusPill`,
  `PomodoroBanner`) settled at `top: 100` for breathing room
  below the HUD bar (originally `16`, then `80`, finally `100`
  per user feedback).
- The Chat icon was added between Profile and Quests (PR #36) —
  the menu now reads Profile · Chat · Quests · Events · Settings.
- The HUD username font swapped from IM Fell italic 17px →
  JetBrains Mono 600/15px (PR #38) so it pairs with the Shield
  digit. Same PR hid the local player's in-world nameplate via
  `LocalAvatar`; remote peers keep theirs (multiplayer would be
  anonymous otherwise).
- Remote nameplate format: PR #40 tried `(2) Sample` (parens-
  prefix, single Phaser Text) — superseded ten minutes later by
  PR #42, which replaced the parens with a real Phaser `Arc`
  badge (radius 10, dark `--ink` fill, 1.5 px bronze stroke,
  gilt 12 px digit centred) and switched the name font Georgia
  bold → `'JetBrains Mono', Menlo, Consolas, monospace`. The
  badge palette echoes the HUD shield in a smaller form factor.
  `AvatarVisuals` shape grew `levelBadge` + `levelText` fields;
  layout `[badge][gap][name]` centred under the avatar. New
  `setVisualsNameplateVisible(visuals, visible)` helper toggles
  all three pieces together, used by `LocalAvatar` to hide its
  own nameplate.
- PR #45 bumped nameplate sizes a touch after the user said the
  badge + text read small at the initial 10/12/15 dimensions:
  `NAMEPLATE_BADGE_RADIUS` 10 → 12, `NAMEPLATE_BADGE_GAP` 6 → 7,
  level digit 12px → 14px, name 15px → 17px.

The polish PRs are documented in the Phase 14 changelog ("Polish
trail" section). The decision rationale (Kenney 9-slice + SVG
shield + CSS-token fill) above is still load-bearing — none of
the polish overturned it.
