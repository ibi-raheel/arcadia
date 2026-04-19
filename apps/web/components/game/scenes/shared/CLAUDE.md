# Shared scene helpers

Cross-scene utilities. Small, pure-function modules used by two or more scenes.

## Files

- `iso-math.ts` — screen ↔ tile coordinate conversions for the 64×32 (2:1) isometric grid
- `types.ts` — cross-scene TS types (avatar-id keys, direction union, building-name union)

## Configs

None. Shared helpers have no config files — if a value is shared between scenes, it lives here as an exported `const`, not in a per-scene config.

## Config leak discipline

If a value is used by only one scene, it belongs in that scene's `sprites.config.ts` / `camera.config.ts` / `layers.config.ts` — **not** here. Pulling a scene-local value into `shared/` is premature sharing. Wait until a second scene actually needs it.

## Phase ownership

Folder created Phase 1 Step 1. `iso-math.ts` and `types.ts` land as WorldScene work requires them (Phase 1 Steps 7+).
