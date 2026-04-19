# Game — Phaser code

All Phaser scene code for Arcadia lives under this folder. React pages (Academy, Market) are in `apps/web/app/` and never touch Phaser per TAD §4.2.

## Convention (ADR 0004)

Every Phaser scene owns a folder under `scenes/<scene>/` containing:

- `<Scene>Scene.ts` — the scene class (PascalCase file matches class name)
- `camera.config.ts`, `sprites.config.ts`, `layers.config.ts` — typed `as const` config modules
- `__tests__/` — colocated Vitest (y-sort ordering, config-shape assertions)
- `CLAUDE.md` — ≤20 lines: purpose, config knobs, art loaded, sync relationships

**Scene classes import configs and never hardcode tweakable values.** Zoom, follow-lerp, deadzone, spawn tile, body offsets, fade durations, walk speed, entrance/exit coordinates, y-sort layer order — all live in `*.config.ts`. Runtime behaviours (camera fade/shake calls, animation playback, input wiring) stay in the scene class.

Art (PNGs, atlases, tilemaps) stays central in `apps/web/public/{avatars,tilesets,maps}/`. Per-scene folders hold only TypeScript + CLAUDE.md.

## Phase 1 placeholder visuals

Phase 1 ships with **Phaser `Rectangle` primitives** for avatars + buildings, and a **trivial placeholder tileset PNG** (grass + path) for the tilemap ground. No sprite sheets, no atlases. Avatar colors map stably to `avatar-01`…`avatar-08` keys in `scenes/world/sprites.config.ts`. When real art lands, the swap is file-level (`Rectangle` → `Sprite(atlasKey)`; placeholder.png → real tileset images). Scene code unchanged.

## Phase 1 scenes (shipping now)

- `scenes/boot/` — BootScene. Preloads assets, hands off to WorldScene. No configs (no tweakable values).
- `scenes/world/` — WorldScene. Outdoor isometric world, local avatar, movement, collision, y-sort, camera follow, building entrance zones.
- `scenes/shared/` — cross-scene helpers (`iso-math.ts` for screen↔tile conversions, cross-scene types).

## Future scenes (expansion path — do not build in Phase 1)

- **Phase 2 Week 7** → `scenes/tavern/` — interior tilemap, Colyseus-synced remote avatars, chat is a React overlay (not a scene object).
- **Academy and Market** — never get a Phaser scene. Pure React pages (`app/academy`, `app/market`) per TAD §4.2.
- **V2 customisable worlds** — per-creator scenes follow the same folder convention. Config-driven appearance already aligns.

## Scoping `claude` into a scene folder

- `cd apps/web/components/game && claude` — game-wide context (this file + every scene CLAUDE.md).
- `cd apps/web/components/game/scenes/world && claude` — world-only context, minimal footprint. Useful for camera/sprite tweaks without loading the rest of the repo.

## Invariants

- Phaser mount is `GameWorld.tsx` with `dynamic(..., { ssr: false })` per TAD §3.2. Never import Phaser in any file Next.js may server-render — build will crash.
- Collision geometry comes from the tilemap `collision` layer (single source of truth). Building `Rectangle` placeholders are visual only.
- Idle ↔ walk state is a zero-delay toggle on `isMoving`. No 2s timer (user decision 2026-04-18 overrides phase-plan Week 4).
- Scene tests must include a config-shape assertion so future edits that drop a config key fail CI.
