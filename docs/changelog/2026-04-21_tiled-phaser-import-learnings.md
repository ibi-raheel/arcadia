# 2026-04-21 — Tiled → Phaser import pipeline: learnings

Captured while iterating on throwaway preview branches (`world-preview-square`, `world-preview-v2`, `world-v3`) for the ADR-0007 world swap. These bit us; ADR 0007 now carries the canonical wiring.

## The five rules

1. **Embed Tilesets when exporting.** Phaser rejects external `.tsx` refs. `scripts/import-tiled-world.mjs` inlines them as a fallback, but authoring with Embed Tilesets on is the canonical flow.
2. **`load.image`, never `load.spritesheet`, for tilesets.** Spritesheet frames override the tileset's internal slicing → `createFromObjects` renders the whole PNG per object (Phaser #5403). `addTilesetImage` slices internally using `tilewidth` / `tileheight` from the TMJ.
3. **`map.createFromObjects(layerName, { classType: Phaser.GameObjects.Sprite })` with no `frame` param.** Phaser resolves `gid → tileset → frame` via the `firstgid` ranges. If you're computing `gid - firstgid` by hand, you loaded a spritesheet by mistake.
4. **Iterate tile layers by index.** Duplicate layer names are legal in Tiled — use `map.layers.forEach((_, idx) => map.createLayer(idx, tilesets, 0, 0))`.
5. **`sprite.setDepth(sprite.y)` per object-layer sprite.** Pairs with the avatar's `depth = y + halfHeight` for y-sort.

## Reference implementation

`apps/web/app/world-v3/GameWorldV3.tsx` (commit `8d95c0e`) — working throwaway scene that demonstrates all five rules.

## What we tried that was wrong

- Switching to `load.spritesheet` with `frameWidth` / `frameHeight` — broke `createFromObjects`.
- Explicit frame picking via `add.sprite(x, y, key, gid - firstgid)` — works for single tiles but throws away Phaser's gid resolution, and the moment you have multiple tilesets the firstgid math gets fragile.
- `tileoffset` hacks to paper over the oversized-tile anchor mismatch — Phaser team has flagged these as workarounds, not the path (see ADR 0007 §Context).

## Downstream

- ADR 0007 now carries the five rules under a "Phaser wiring gotchas" section.
- When the world-swap lands on `/world`, wire via a shared helper — don't re-implement per scene.
