# BootScene

Preload scene. Moves bytes over the wire before WorldScene needs them, then hands off.

## Files

- `BootScene.ts` — preload scene class. Uses Phaser's built-in `LoaderPlugin` (which auto-emits `'progress'` events consumed by the React loading screen in Phase 1 Step 20), then starts `WorldScene`.
- `asset-manifest.ts` — typed asset registry (`BOOT_ASSETS`, `BOOT_SCENE_KEY`, `NEXT_SCENE_KEY_AFTER_BOOT`). Split out of `BootScene.ts` so tests can verify paths + file existence without needing to import Phaser.
- `__tests__/asset-manifest.test.ts` — verifies asset paths and on-disk existence.

## Configs

No camera/sprites/layers configs (ADR 0004 canonical three) — BootScene has no such values. `asset-manifest.ts` is the scene's only data module; it is intentionally not named `*.config.ts` because it lists assets to preload, not runtime-tweakable knobs.

## Assets loaded (Phase 1)

- `public/tilesets/world.png` — 704×704 iso tileset (11×11 grid of 64×64 tiles, 115 filled). Full tile-index semantics in `scripts/generate-world-tmj.mjs`.
- `public/maps/world.tmj` — Tiled isometric tilemap JSON (30×30, 64×32 tiles).
- Every avatar spritesheet declared in `AVATAR_SHEETS` (see `asset-manifest.ts`). Today: `avatar-01` (Knight — Aseprite export) + `avatar-02` (LPC-standard female — cropped from the 13-column generator output) idle / walk / jump. Missing sheets are skipped — the corresponding avatar renders as a `Rectangle` placeholder in LocalAvatar.

## Synced with

Nothing. Pre-Colyseus.

## Phase ownership

Created Phase 1 Step 1 as a stub. Populated Phase 1 Step 5.
