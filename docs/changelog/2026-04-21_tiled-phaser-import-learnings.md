# 2026-04-21 — Tiled → Phaser import: the working pattern

Captured after landing `world-v1-preview`, which renders `Arcadia world1.tmj` correctly: 50×50 orthogonal @ 64px, 96 embedded tilesets, mixed 128/256/512/1024 decor on object layers.

## The seven rules

1. **Embed Tilesets on export.** Phaser rejects external `.tsx` refs.
2. **`load.spritesheet` per tileset** with `frameWidth` / `frameHeight` from the TMJ `tilewidth` / `tileheight`. Registers one frame per tile.
3. **Explicit frame picking:** `localTileIndex = gid - tileset.firstgid`, then `add.sprite(x, y, 'ts-<name>', localTileIndex)`. Don't use `createFromObjects` — fragile across multi-tileset maps.
4. **Shift object y by `+ map.tileHeight`.** Tiled's tile-object y sits one grid row above where the sprite visually belongs.
5. **`setOrigin(0, 1)`** (bottom-left), then `setDisplaySize(obj.width, obj.height)` per object sprite.
6. **`setDepth(y)`** per object sprite for y-sort against the avatar.
7. **Iterate tile layers by index**, not name — duplicate layer names are legal in Tiled.

Reference: `apps/web/app/world-v1/GameWorldV1.tsx` (commit `7d5b7ef`). Canonical wiring now lives in ADR 0007 under "Phaser wiring — the pattern that actually works".

## Dead ends

- **`load.image` + `createFromObjects`** — the answer most online guides give. Rendered the whole sheet per object against multi-tileset maps.
- **`tileoffset` hacks** to paper over the oversized-tile anchor mismatch — upstream flags these as workaround-not-path (see ADR 0007 §Context).
- **Skipping the y-shift.** Every sprite floats one grid row too high without `+ map.tileHeight`.

## Downstream

When the world swap lands on `/world`, wire via a shared helper (`spawnObjectLayer`) rather than re-implementing per scene.
