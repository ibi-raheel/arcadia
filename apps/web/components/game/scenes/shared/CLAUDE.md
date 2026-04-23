# Shared scene helpers

Cross-scene utilities. Small, pure-function modules used by two or more scenes.

## Files

- `iso-math.ts` — screen ↔ tile coordinate conversions for the 64×32 (2:1) isometric grid (legacy iso world; kept for reference).
- `y-sort.ts` — pure `calculateYSortDepth(obj, { depthBase, yAnchorRatio })` used by every image-backed scene for per-frame depth sorting.
- `avatar-palette.ts` — 8 stable `AVATAR_IDS`, `AVATAR_COLORS` (Tailwind-500 palette for Rectangle placeholders), `AVATAR_NAMES` (human-readable labels shown in the onboarding picker), `AvatarId` type + `isAvatarId` guard.
- `types.ts` — cross-scene TS types: re-exports `AvatarDirection` + `AVATAR_DIRECTIONS` (cardinal n/e/s/w) from `@arcadia/shared` so client code uses the exact literals the Colyseus protocol ships. Local types: `AvatarAction` (`idle`/`walk`/`jump`), `BUILDING_NAMES` + `BuildingName` + `isBuildingName`, `TileCoord`, `PixelRect`.
- `colliders.ts` — `spawnColliders(scene, rects)` StaticGroup builder. All image-backed scenes ship empty collider arrays and activate the moment rects are authored (Phase-5 Step 15 scaffold).
- `enter-prompt.ts` *(2026-04-22)* — proximity "Press ENTER to visit X" prompts used by the three outdoor scenes. (Originally on SPACE; moved to ENTER on 2026-04-22 so jump stops eating the prompt.) Exports `findNearestActiveTrigger` (pure, unit-tested) + `createEnterPromptManager`.
- `edge-triggers.ts` *(2026-04-22)* — walk-onto scene-edge portals. Exports `hitEdge` (pure) + `createEdgeTriggerManager`. Used by the square (4 edges) and each outdoor scene (1 return edge).
- `capacity-hud.ts` *(2026-04-22)* — top-right fade-in pill showing `<label> · <count> / <max>`. Used by `SquareScene`, `TavernScene`, `CoworkingInsideScene` — one per Colyseus-backed scene. Driven by `room.state.avatars.size` on each add/remove callback.
- `outdoor-scene-base.ts` *(2026-04-22)* — abstract Phaser scene the three outdoor scenes extend (`AcademyOutsideScene`, `TavernOutsideScene`, `CoworkingOutsideScene`). Owns image load, LocalAvatar wiring, input loop, SPACE-is-jump, and ENTER-is-enter-prompt. Subclasses only declare scene key + `sceneConfig` (assembled from sibling `*.config.ts` files per ADR 0004). Also reads `OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY` so `/tavern-outside` can spawn the member next to a specific tavern door when returning from an interior.
- `building-names.ts` *(2026-04-22)* — display-name maps for per-building Colyseus shards. `TAVERN_DISPLAY_NAMES` (`tavern-a` → "The Three Ravens", etc.) + `tavernDisplayName()` / `tentDisplayName()` helpers feed the HUD + transition overlay labels.

## Configs

None. Shared helpers have no config files — if a value is shared between scenes, it lives here as an exported `const`, not in a per-scene config.

## Config leak discipline

If a value is used by only one scene, it belongs in that scene's `sprites.config.ts` / `camera.config.ts` / `layers.config.ts` — **not** here. Pulling a scene-local value into `shared/` is premature sharing. Wait until a second scene actually needs it.

## Phase ownership

Folder created Phase 1 Step 1. `iso-math.ts` and `types.ts` land as WorldScene work requires them (Phase 1 Steps 7+). `enter-prompt.ts` / `edge-triggers.ts` / `capacity-hud.ts` / `outdoor-scene-base.ts` added 2026-04-22 alongside the image-backed world + outdoor scenes — see `docs/changelog/2026-04-22_image-backed-world.md`.
