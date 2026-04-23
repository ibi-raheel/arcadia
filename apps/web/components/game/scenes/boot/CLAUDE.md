# BootScene

Preload scene. Moves bytes over the wire before WorldScene needs them, then hands off.

## Files

- `BootScene.ts` — preload scene class. Uses Phaser's built-in `LoaderPlugin` (which auto-emits `'progress'` events consumed by the React loading screen in Phase 1 Step 20), then starts `WorldScene`.
- `asset-manifest.ts` — typed asset registry (`BOOT_ASSETS`, `BOOT_SCENE_KEY`, `NEXT_SCENE_KEY_AFTER_BOOT`). Split out of `BootScene.ts` so tests can verify paths + file existence without needing to import Phaser.
- `__tests__/asset-manifest.test.ts` — verifies asset paths and on-disk existence.

## Configs

No camera/sprites/layers configs (ADR 0004 canonical three) — BootScene has no such values. `asset-manifest.ts` is the scene's only data module; it is intentionally not named `*.config.ts` because it lists assets to preload, not runtime-tweakable knobs.

## Assets loaded

- **Legacy iso tileset + map** (`public/tilesets/world.png`, `public/maps/world.tmj`) — still preloaded for the untouched legacy `WorldScene`; no longer routed at `/world` since 2026-04-22.
- **Image-backed interiors**: `tavern-interior.png` (1536×1024), `academy-interior.png`, `market-interior.png`, plus the Phase-1 tavern `tavern.tmj` (preloaded but unused in-scene since the image swap).
- **Image-backed outdoor set** *(2026-04-22)*: `public/worlds/square-2508x2508.png` + the four neighbour images (academy / tavern-outside / coworking-outside / coworking-inside). Declared as `BOOT_ASSETS.squareOutside`, `academyOutside`, `tavernOutside`, `coworkingOutside`, `coworkingInside`.
- Every avatar spritesheet declared in `AVATAR_SHEETS`. Today: `avatar-01` (Knight — Aseprite export) + `avatar-02` (LPC-standard female — cropped from the 13-column generator output) idle / walk / jump. Missing sheets are skipped — the corresponding avatar renders as a `Rectangle` placeholder in LocalAvatar.

## Synced with

Nothing. Pre-Colyseus.

## Phase ownership

Created Phase 1 Step 1 as a stub. Populated Phase 1 Step 5.
