# ADR 0004: Per-scene folder + TS-config convention for Phaser code

- **Status:** Accepted
- **Date:** 2026-04-18
- **Deciders:** Arcadia build owner
- **Related:** ADR 0001 (Phaser 3.88+ locked); `docs/mvp/tad.md` §3.2, §4.2; `phases/phase-01_plan.md`

## Context

Phase 1 (`phases/phase-01_plan.md`) introduces the first real Phaser scenes: `BootScene` (preload) and `WorldScene` (the outdoor isometric world with avatar movement, collision, and building entrance zones). Phase 2 will add `TavernScene`; Academy and Market remain React-only per TAD §4.2 (no Phaser scene).

Without a convention, every scene ends up as a single large file with tweakable values (camera zoom, follow-lerp, deadzone, spawn tile, body offsets, idle timeout, fade durations, building entrance/exit tiles) hardcoded inline. That has two concrete costs this project cares about:

1. **Tweak friction.** Changing "the Tavern camera zoom" means reading the scene class to locate the value. The git diff reads "changed 43 lines of `TavernScene.ts`" when what actually changed was a single number.
2. **Claude-context friction.** When scoping a `claude` session to a single scene folder (`cd apps/web/components/game/scenes/world && claude`), the scene-level context should be immediately legible without having to pull in the entire codebase or the full `apps/web` tree.

This ADR records the convention put in place for Phase 1 and binding on all future Phaser scenes.

## Decision

### 1. Per-scene folder

Every Phaser scene owns a folder under `apps/web/components/game/scenes/<scene>/`. The folder contains:

- `<Scene>Scene.ts` — the scene class (code). PascalCase file name matches the class name (`WorldScene.ts`, `TavernScene.ts`).
- `camera.config.ts` — camera configuration as a typed TS module.
- `sprites.config.ts` — sprite / entity configuration.
- `layers.config.ts` — y-sort layer order, overlay layer names, depth constants.
- `__tests__/` — Vitest colocated tests, including config-shape assertions.
- `CLAUDE.md` — ≤20-line context stub: what the scene is, what configs it exposes, what art it loads, who it's synced with (Phase 2+ Colyseus rooms).

Art assets (PNGs, atlases, tilemaps) **stay central** in `apps/web/public/{avatars,tilesets,maps}/`. Per-scene folders hold only TypeScript and scene-local CLAUDE.md — not binary assets — because atlases are shared across scenes.

### 2. Typed TS config modules (not JSON)

Configs are TypeScript modules exporting `as const` objects. Example:

```ts
// scenes/world/camera.config.ts
export const worldCameraConfig = {
  zoom: 1.0,
  followLerp: 0.1,
  deadzone: { x: 100, y: 100 },
  bounds: { x: 0, y: 0, width: 1920, height: 960 },
  fadeInMs: 300,
  fadeOutMs: 300,
} as const;
```

Scene classes `import` the config and use it. Benefits over JSON:

- IDE autocomplete + jump-to-definition
- Compile-time shape checking
- No parse-error surface at runtime
- Tree-shaken by Vite / Turbopack if unused in a given build

### 3. Scene classes never hardcode tweakable values

Runtime-tweakable values (camera zoom, lerp, deadzone, bounds, fade durations, avatar spawn tile, scale, body offset, walk speed, idle timeout, building entrance/exit coordinates, y-sort layer order, depth constants) live in `*.config.ts`. The scene class reads them.

Runtime **behaviours** (fade/shake calls, animation playback, collision handlers, input wiring) stay in the scene class. The split is: *what* values drive the scene lives in configs; *how* those values get applied lives in code.

Enforcement: each scene's `__tests__/` directory contains a config-shape Vitest that asserts the config object has the expected keys and primitive types. Future edits that drop a field fail CI. The Phase 1 exit criterion *"grep `WorldScene.ts` for tweakable numeric literals — should return none"* makes this a review-time check.

### 4. Per-folder `CLAUDE.md` with documented expansion path

Two levels of Claude context files land under `apps/web/components/game/`:

- **Game-level** `apps/web/components/game/CLAUDE.md` — documents this convention, records the future-scene expansion path (Tavern in Phase 2 Week 7; Academy/Market stay React-only forever), and anchors the folder structure so `claude` sessions scoped to `components/game/` are productive.
- **Per-scene** `CLAUDE.md` in each `scenes/<scene>/` folder — ≤20 lines: purpose, config knobs, art it loads, sync relationships. Scoping `claude` to a single scene folder should give useful answers to "what does this scene do and what can I tweak" from local context alone.

### 5. Scope: Phaser scenes only

This convention applies to **Phaser scenes** under `apps/web/components/game/scenes/`. It does **not** apply to:

- React pages (`apps/web/app/`) — those follow Next.js App Router convention.
- Shared game helpers (`apps/web/components/game/scenes/shared/`) — small cross-scene utilities like `iso-math.ts`; no config files needed.
- The game mount (`apps/web/components/game/GameWorld.tsx`) — a single React component, no config split.
- `/packages/shared` — schemas and protocol constants live there per existing convention.

## Expansion path

Future scenes land in their own folder following the same shape:

| Phase | Folder created | Notes |
|---|---|---|
| Phase 1 | `scenes/boot/`, `scenes/world/`, `scenes/shared/` | BootScene (no configs — preload only), WorldScene (full config split), shared helpers. |
| Phase 2 Week 7 | `scenes/tavern/` | Interior tilemap; Colyseus-synced remote avatars; chat UI is a React overlay (not a scene object). Full config split. |
| V2 (post-MVP) | Per-creator scenes (TBD) | Customisable worlds — config-driven-appearance already aligns with V2's "swappable sprites" design. |

**Academy and Market never get a Phaser scene** (TAD §4.2). The `/academy` and `/market` routes are pure React pages.

## Consequences

- **Phase 1 Step 1** creates the folder structure and game-level CLAUDE.md before any scene code is written, so Steps 2+ land into named homes.
- **Git diffs for tweaks are readable.** Changing a camera value is one line in a config file, not a scene-class edit.
- **Claude context scoping works.** `cd apps/web/components/game/scenes/world && claude` picks up root → apps → game → world CLAUDE.md stack and has everything it needs for camera/sprite tweaks without touching the rest of the repo.
- **Config leak risk.** If two scenes share a value, it must move to `scenes/shared/` (a constants module). Prematurely sharing values across scenes is also a failure mode — keep values scene-local until a second scene actually needs them.
- **V2 alignment** is incidental but real. Config-driven scene appearance is exactly what the V2 "customisable worlds via swappable sprites on the same codebase" path wants. Not a reason to adopt this now; a free future win.
- **No extra build cost.** TS configs are tree-shaken, typechecked in the existing `tsc --noEmit` CI step, and introduce no new toolchain.

## Revisiting this decision

Reopen this ADR if:

- The config-split overhead becomes a real friction point in review or iteration (e.g. configs always change 1:1 with scene code).
- A Phaser scene grows complex enough that the `*.config.ts` files themselves need sub-splitting (e.g. `camera.config.ts` becomes 300 lines) — that's a successor ADR, not a reopening.
- V2 formalises a different "creator-authored scene" authoring path that changes the source-of-truth for scene structure.
