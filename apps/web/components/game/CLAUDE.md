# Game — Phaser code

All Phaser scene code for Arcadia lives under this folder. React pages (Academy, Market) are in `apps/web/app/` and never touch Phaser per TAD §4.2.

## Convention (ADR 0004)

Every Phaser scene owns a folder under `scenes/<scene>/` containing:

- `<Scene>Scene.ts` — the scene class (PascalCase file matches class name)
- `camera.config.ts`, `sprites.config.ts`, `layers.config.ts` — typed `as const` config modules
- `__tests__/` — colocated Vitest (y-sort ordering, config-shape assertions)
- `CLAUDE.md` — purpose, files, configs, art loaded, sync relationships

**Scene classes import configs and never hardcode tweakable values.** Zoom, follow-lerp, deadzone, spawn tile, body offsets, fade durations, walk speed, entrance/exit coordinates, y-sort layer order — all live in `*.config.ts`. Runtime behaviours (camera fade/shake calls, animation playback, input wiring) stay in the scene class.

Art (PNGs, atlases, tilemaps) stays central in `apps/web/public/{avatars,tilesets,maps}/`. Per-scene folders hold only TypeScript + CLAUDE.md.

## World rendering model

- **Tilemap** — 30×30 isometric map (Tiled `orientation: "isometric"`), 64×32 (2:1) AoE-flat diamond tiles. `world.tmj` layers: `ground`, `collision`, `overlay`. Rendered in `WorldScene` via Phaser's built-in iso tilemap loader.
- **Camera** — screen-space follow with lerp + deadzone. Movement is screen-space (WASD/arrows/click go straight up/down/left/right regardless of iso projection).
- **Avatar** — 64×64 frame. Rendered as a Phaser `Sprite` if a spritesheet for the member's `avatar_id` is registered in `AVATAR_SHEETS`, otherwise as a colored `Rectangle` placeholder.

## Avatar pipeline

Per-avatar spritesheets live at `apps/web/public/avatars/<avatar-id>/<action>.png`. Each sheet is a grid of 64×64 frames, one row per cardinal facing direction (n/w/s/e, top to bottom for avatar-01).

Registered in `scenes/boot/asset-manifest.ts` → `AVATAR_SHEETS`. BootScene preloads every declared sheet; `avatar-animations.ts` creates one Phaser animation per `(avatarId, action, direction)` — keys follow `<avatarId>-<action>-<direction>`, e.g. `avatar-01-walk-n`.

Actions wired today: `idle` (looping), `walk` (looping), `jump` (one-shot, spacebar-triggered).

Drop a new sheet file, add an entry to `AVATAR_SHEETS`, and the animations register on next BootScene run. No scene-code changes.

## Phase 1 scenes (shipping now)

- `scenes/boot/` — BootScene. Preloads tilemap + placeholder tileset + every declared avatar spritesheet. Progress events forward to the React loading screen.
- `scenes/world/` — WorldScene. Outdoor isometric world; owns tilemap rendering, camera follow, collision, y-sort registry, avatar lifecycle, input (WASD + arrows + click + space), building entrance zones, fade transitions to building shells.
- `scenes/shared/` — cross-scene helpers. `iso-math.ts` (tile↔pixel projection), `y-sort.ts` (depth from y-anchor), `avatar-palette.ts` (8 stable avatar IDs + colors + names), `types.ts` (cross-scene unions).

## Future scenes (expansion path — do not build in Phase 1)

- **Phase 2 Week 7** → `scenes/tavern/` — interior tilemap, Colyseus-synced remote avatars, chat is a React overlay (not a scene object).
- **Academy and Market** — never get a Phaser scene. Pure React pages (`app/academy`, `app/market`) per TAD §4.2.
- **V2 customisable worlds** — per-creator scenes follow the same folder convention. Config-driven appearance already aligns.

## Scoping `claude` into a scene folder

- `cd apps/web/components/game && claude` — game-wide context (this file + every scene CLAUDE.md).
- `cd apps/web/components/game/scenes/world && claude` — world-only context, minimal footprint. Useful for camera/sprite tweaks without loading the rest of the repo.

## Invariants

- Phaser mount is `GameWorld.tsx` with `dynamic(..., { ssr: false })` per TAD §3.2. Never import Phaser in any file Next.js may server-render — build will crash.
- Phaser imports use namespace form: `import * as Phaser from 'phaser'`. The ESM build has no default export, so `import Phaser from 'phaser'` fails under Next's dev-mode bundler.
- Collision geometry comes from the tilemap `collision` layer (single source of truth). Building `Rectangle` placeholders are visual only.
- Idle ↔ walk state is a zero-delay toggle on `isMoving`. No 2s timer (user decision 2026-04-18 overrides phase-plan Week 4).
- Character facing is cardinal (n/e/s/w), not iso diagonal — sprites were drawn with 4 cardinal poses. `velocityToFacingDirection` buckets velocity into the nearest cardinal (dominant axis, horizontal ties).
- Scene tests must include a config-shape assertion so future edits that drop a config key fail CI.
