# ADR 0016 — Coworking interactables: hand-pick coordinates over the PNG

**Date:** 2026-04-25
**Status:** Accepted
**Related:** Phase 12 plan, ADR 0007 (Tiled object layers — legacy
world), ADR 0015 (React popup not Phaser).

## Context

The coworking-inside scene's art (`public/worlds/coworkinginside-
2508x2508.png`, 2508×2508) renders six richly-drawn interactables —
jukebox, round table, wooden chest, bookshelf, easel painting,
sigil banner — all baked into the static background.

Phase 12 wants to make those objects functional: walk near the
jukebox, ENTER opens a station picker; walk near the chest, ENTER
opens the Pomodoro hourglass; etc.

Two ways to wire each interactable's hit-box:

1. **Author the rects in Tiled.** Keep coords in
   `coworkinginside.tmj` object layers; load + parse at scene
   start. ADR 0007's pattern.
2. **Hand-pick + hardcode.** Read the PNG in an image viewer, eye-
   ball the centre + radius for each interactable, write `{id,
   centerX, centerY, radius}` literals into
   `coworkingInsideLayersConfig.INTERACTABLES`.

## Decision

**Hand-pick. No Tiled, no `.tmj` for this scene.**

The coords live as a typed `INTERACTABLES` const in
`coworkingInsideLayersConfig`. Each entry mirrors the existing
`SQUARE_NPC` / `SQUARE_LODGE_ENTRY` patterns — a coordinate, a
radius, a label, and a unique `id` the scene uses to wire prompts
+ events.

## Rationale

**The art is fixed.** Unlike the legacy Tiled world (ADR 0007,
where the user iterated on the map daily), `coworkinginside-2508
×2508.png` is a hand-painted single asset. The likelihood of the
jukebox moving is near-zero. Designing for "frequent re-position"
is solving a problem we don't have.

**One source of truth, no parser.** Tiled object layers need a
loader at scene start, a parser, schema validation, and a way to
fall back when the file is missing. Hardcoded coords are a single
typed const, validated by the existing scene config-shape test,
zero runtime cost.

**Pattern consistency.** SquareScene already has this — the
Wanderer NPC, the Lodge Entry, and the four edge triggers all
live as typed consts. AcademyScene has the lectern position
hardcoded. MarketScene has the crystal hardcoded. Adding Tiled
mid-stream just for coworking would make this scene the outlier.

**Easy to revisit.** If a future PNG repaint moves the jukebox 60
pixels left, the fix is a one-line edit. If 12.B grows the
interactable list to twelve and authoring becomes painful, *that*
is when we promote to Tiled — not before.

## Consequences

**Good:**

- Six interactables ship as a single typed const + six
  proximity-prompt registrations in `create()`.
- Existing config-shape tests catch typos.
- No new runtime asset to load (the .tmj would have been ~3 KB but
  it's still a fetch).
- Same mental model as every other image-backed scene.

**Watch out:**

- Hand-eyeballed coords drift from the art if the PNG is repainted
  off the same canvas dimensions. Counter: a sentinel inside the
  PNG (e.g. a pixel at the jukebox's centre) + a manual
  recalibration if the art changes substantially.
- 12.B doubles the interactable count; if `INTERACTABLES` exceeds
  ~12 entries this ADR should be revisited.

## Alternatives considered

- **Tiled object layer.** Rejected for the reasons above. The
  legacy world used Tiled because the map was procedurally
  generated and iterated on; this scene is a single hand-painted
  PNG.
- **Load coords from a JSON sidecar.** Same overhead as Tiled
  without Tiled's editing UX. Skip.
- **Render a transparent SVG overlay.** Allows artist-driven hit
  zones, but adds a runtime dependency for zero functional benefit
  at six interactables.

## Implementation notes

1. `coworkingInsideLayersConfig` gains:
   ```ts
   export const COWORKING_INTERACTABLES = {
     jukebox:  { id: 'jukebox',  centerX: 1800, centerY: 1100, radius: 220, label: '…' },
     chest:    { id: 'chest',    centerX: 1700, centerY: 560,  radius: 200, label: '…' },
     // 12.B placeholders:
     table:    { id: 'table',    centerX: 1254, centerY: 1300, radius: 280, label: '…' },
     bookshelf:{ id: 'bookshelf',centerX: 520,  centerY: 520,  radius: 220, label: '…' },
     easel:    { id: 'easel',    centerX: 2050, centerY: 1400, radius: 200, label: '…' },
     banner:   { id: 'banner',   centerX: 1254, centerY: 200,  radius: 0,   label: '' }, // pure-display
   } as const;
   ```
2. Each interactable's `centerX/centerY` is eyeballed from the
   2508×2508 PNG. Radii are generous so the prompt fires before
   the avatar walks INTO the object's collider.
3. `CoworkingInsideScene.create()` instantiates one
   `ProximityPromptManager` per active interactable; only the
   ones 12.A enables (`jukebox` + `chest`) wire up in this phase.
4. Banner has `radius: 0` because it never fires — its presence
   in the const just documents where the screen-anchored Hearth
   pill mirrors visually.
