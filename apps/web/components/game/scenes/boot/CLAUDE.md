# BootScene

Preload scene. Moves bytes over the wire before WorldScene needs them, then hands off.

## Files

- `BootScene.ts` — preload scene class. Uses Phaser's built-in `LoaderPlugin` (which auto-emits `'progress'` events consumed by the React loading screen in Phase 1 Step 20), then starts `WorldScene`.
- `asset-manifest.ts` — typed asset registry (`BOOT_ASSETS`, `BOOT_SCENE_KEY`, `NEXT_SCENE_KEY_AFTER_BOOT`). Split out of `BootScene.ts` so tests can verify paths + file existence without needing to import Phaser.
- `__tests__/asset-manifest.test.ts` — verifies asset paths and on-disk existence.

## Configs

No camera/sprites/layers configs (ADR 0004 canonical three) — BootScene has no such values. `asset-manifest.ts` is the scene's only data module; it is intentionally not named `*.config.ts` because it lists assets to preload, not runtime-tweakable knobs.

## Assets loaded (Phase 1)

- `public/tilesets/placeholder.png` — 2-tile placeholder (grass + path)
- `public/maps/world.tmj` — Tiled tilemap JSON

No avatar atlases in Phase 1 (placeholders are runtime Rectangles). Real atlases land as a post-Phase-1 polish swap.

## Synced with

Nothing. Pre-Colyseus.

## Phase ownership

Created Phase 1 Step 1 as a stub. Populated Phase 1 Step 5.
