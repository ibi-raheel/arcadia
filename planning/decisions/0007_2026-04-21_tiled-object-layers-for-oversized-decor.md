# ADR 0007 — Use object layers (not tile layers) for oversized decor in Tiled maps

**Status:** accepted
**Date:** 2026-04-21
**Deciders:** user
**Related:** `phases/phase-02_polish_backlog.md` (world-swap polish item), `docs/mvp/tad.md` §4.1 (rendering)

## Context

Phase-3/4 demo art is in place. The user is authoring a top-down orthogonal world in Tiled with mixed tile sizes — a 64×64 map grid with terrain tilesets at 128×128 and decor tilesets at 128/256/512/1024 px (trees, lamps, fountain, academy building). The plan was to render everything as tile layers.

Research into the Tiled→Phaser pipeline (2026-04-21) surfaced a fundamental mismatch:

- **Tile layers in Tiled's editor** anchor oversized tiles at the **bottom-left** of the grid cell — tiles extend up and right.
- **Phaser 3's tilemap renderer** anchors tile-layer tiles at the **top-left** of the cell — tiles extend down and right.
- `tileoffset` can paper over the shift, but the Phaser team has explicitly said it's a workaround, not the path (photonstorm/phaser#5516, #4097, #6059).
- Same-size tilesets on a matching grid work fine in both tools. The shift only affects oversized tile-layer tiles.

The canonical pattern for Zelda / Stardew Valley / Pokémon-style 2D top-down games — confirmed in Phaser examples, Ourcade tutorials, and Stardew's loader talks — is:

1. **Tile layers** hold only same-size terrain (grass, paths, walls) that matches the grid.
2. **Object layers** hold oversized decor (trees, lamps, buildings, fountains). In Tiled: right-click a tileset tile → "Insert as object" → place on an object layer at a free pixel coordinate.
3. **Phaser** renders tile layers normally + calls `map.createFromObjects('<layer-name>')` on every object layer. The returned Sprites get `setOrigin(0, 1)` (matches Tiled's bottom-left anchor) and `sprite.depth = sprite.y` for Y-sorting against the avatar.

This also solves a second problem we would have hit soon: tile layers can't do dynamic depth, so the avatar could never walk **behind** a tree and **in front** of the next one. Object-layer sprites get per-instance `depth` and y-sort naturally.

## Decision

**When the world art swap ships, terrain goes in tile layers and every oversized decor item goes in an object layer.**

Concretely:

- **Tile layers** — grass, cobblestone, mossycobble, and any other 64×64 terrain that repeats. Rendered via `map.createLayer(name, tilesets, 0, 0)` as today.
- **Object layers** — every tree, lamp, fountain, barrel, shrub, rock, and the academy building. In Tiled these are placed via "Insert as object" so they carry a `gid` referring to the tileset tile, plus a free `x, y` position. In Phaser they're spawned via `map.createFromObjects(layerName, { classType: Phaser.GameObjects.Sprite })`, with `setOrigin(0, 1)` and `depth = y` applied during the spawn.
- **No `tileoffset` hacks.** No Python or Node script that re-anchors tile-layer tiles. No inline "fill mode" workarounds.

The existing iso `/world` stays on its current tilemap until the world-swap work lands. This ADR governs the NEXT world (the orthogonal `sprites+worlds 2`-style map) and any subsequent building interiors that move to the tile+object split.

## Consequences

**Positive**

- Parity between Tiled's editor and Phaser's runtime — you author what you see.
- Y-sorting works naturally; avatar can walk behind/in front of individual decor items.
- `createFromObjects` hooks into Phaser's physics system so colliders-per-decor-item is a one-liner later.
- The Tiled project becomes the canonical source; no mid-pipeline munging scripts.

**Negative**

- Requires re-authoring any existing tile-layer decor as object-layer entries in Tiled (one-time cost).
- Object-layer sprites live outside the tilemap batcher, so extreme decor counts (500+ objects on screen) would cost more than tile-layer rendering. Not a concern at current scale.
- Adds a small Phaser-side wiring step per scene (`createFromObjects` + origin/depth config). Standard enough to live in a shared helper.

**Neutral**

- No schema changes. No Phaser version bump. No new dependencies.
- Doesn't affect existing image-backed scenes (Tavern, Academy, Market) — those are single background images, not tilemaps, and continue to work as-is.

## Swap-back / revisit triggers

- If a future iteration of Phaser's tilemap renderer actually honors Tiled's bottom-left anchor for oversized tiles (unlikely but possible), this ADR can be superseded and we'd consolidate back to tile layers.
- If 500+ decor objects per scene start to show up in profiling, we'd revisit by grouping static decor into pre-rendered image layers or a static batch.

Both triggers are far from MVP.

## Implementation plan

When the world-swap work gets picked up (currently punted to the polish list):

1. User re-authors the Tiled map: keeps the `grass` / `mossycobble` / `cobblestone` tile layers, deletes `decor` / `decor2` tile layers, adds an `object_decor` object layer, re-drops every oversized piece via "Insert as object".
2. User exports as TMJ with "Embed tilesets" checked → drops in `apps/web/public/maps/world.tmj`.
3. Engineering wires a shared helper `spawnObjectLayer(scene, map, layerName)` that iterates `createFromObjects` output and applies `setOrigin(0, 1)` + `sprite.depth = sprite.y`.
4. WorldScene swaps from current iso rendering to orthogonal — separate scope from this ADR but the ADR unblocks it.

No Phase-5 impact. Gamification + polish bundle (Phase 5) proceeds as planned with the existing iso world.

## References

- Phaser issue #5516 — oversized tile anchor mismatch: https://github.com/photonstorm/phaser/issues/5516
- Phaser issue #4097 — tile rendering vs Tiled editor: https://github.com/photonstorm/phaser/issues/4097
- Phaser issue #6059 — Tile Render Size property not honored: https://github.com/photonstorm/phaser/issues/6059
- Tiled docs — tile anchoring in layers: https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/
- Tiled docs — `tileoffset`: https://doc.mapeditor.org/en/stable/reference/tmx-map-format/#tileoffset
- Phaser example — createFromObjects: https://phaser.io/examples/v3/view/tilemap/create-from-objects
- Ourcade guide — Tiled object-layer properties: https://blog.ourcade.co/posts/2020/phaser-3-tiled-object-layer-properties/
