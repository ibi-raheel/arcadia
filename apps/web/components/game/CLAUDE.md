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

- **Tilemap** — 30×30 isometric map (Tiled `orientation: "isometric"`), 64×32 (2:1) AoE-flat diamond map grid; source tiles are 64×64 with the extra 32px of height rendering above each cell for the cliff/elevation look of the current pixel-art tileset (`public/tilesets/world.png`, 11×11 grid of 64×64 tiles). `world.tmj` layers: `ground` (grass + dirt paths), `collision` (rock walls + building footprints), `overlay` (short decor — flowers, small bushes). Rendered in `WorldScene` via Phaser's built-in iso tilemap loader.
- **Camera** — screen-space follow with lerp + deadzone. Movement is screen-space (WASD/arrows/click go straight up/down/left/right regardless of iso projection).
- **Avatar** — spritesheets authored at 64×64 per frame; rendered at **32×32** via `setDisplaySize` (halved 2026-04-19 to read better against the new cyberpunk tileset). Arcade Physics feet-body is 16×8, anchored near the bottom of the 32×32 frame. Rendered as a Phaser `Sprite` if a spritesheet for the member's `avatar_id` is registered in `AVATAR_SHEETS`, otherwise as a colored `Rectangle` placeholder.

## Avatar pipeline

Per-avatar spritesheets live at `apps/web/public/avatars/<avatar-id>/<action>.png`. Each sheet is a grid of 64×64 frames, one row per cardinal facing direction (n/w/s/e, top to bottom for avatar-01).

Registered in `scenes/boot/asset-manifest.ts` → `AVATAR_SHEETS`. BootScene preloads every declared sheet; `avatar-animations.ts` creates one Phaser animation per `(avatarId, action, direction)` — keys follow `<avatarId>-<action>-<direction>`, e.g. `avatar-01-walk-n`.

Actions wired today: `idle` (looping), `walk` (looping), `jump` (one-shot, spacebar-triggered).

Drop a new sheet file, add an entry to `AVATAR_SHEETS`, and the animations register on next BootScene run. No scene-code changes.

## Phase 1 scenes (shipping now)

- `scenes/boot/` — BootScene. Preloads tilemap + `world.png` tileset + every declared avatar spritesheet. Progress events forward to the React loading screen.
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

## Known dev-mode gotchas

- **`Cannot find module './522.js'` (or any `./NNN.js`) at `/world`** — Next 14.2's dev-mode webpack manifest desyncs after rapid file changes (add/delete + dep install + HMR cycles). Kill the dev server and wipe the cache:
  ```bash
  lsof -ti:3000 | xargs kill -9
  rm -rf apps/web/.next
  npm run dev --workspace @arcadia/web
  ```
  Not a code bug — a known Next 14 dev-mode fragility. Production builds don't hit it. If it keeps recurring, consider `next dev --turbo` (Turbopack is more resilient to this class of issue).
- **`Attempted import error: 'phaser' does not contain a default export`** — you replaced a namespace import with a default one somewhere. Phaser's ESM build exposes named exports only. Grep for `import Phaser from` and change to `import * as Phaser from`.
- **`world.tmj` or `world.png` returning 307** — middleware is intercepting. Confirm the static-asset extension is in the matcher regex at `apps/web/middleware.ts` (current list: `svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|tmj|json`).
- **Avatar renders as a colored Rectangle even though `<id>/idle.png` exists** — the sheet isn't registered. Check `scenes/boot/asset-manifest.ts` → `AVATAR_SHEETS[<id>]` has an entry matching the files on disk.
- **Server crashes on first state broadcast with `Cannot read properties of undefined (reading 'Symbol(Symbol.metadata)')`** — a schema decorator didn't bind to the MapSchema instance. Two possible causes:
  (1) two copies of `@colyseus/schema` installed (version mismatch between root hoist and a nested copy — `npm ls @colyseus/schema` should show one entry); or
  (2) `useDefineForClassFields: true` in the shared package's tsconfig (we override to `false` in `packages/shared/tsconfig.json` — don't remove it). Both covered in ADR 0005.
- **Client throws `undefined is not an object (evaluating 'e.room.name')` on `joinOrCreate`** — `colyseus` server and `colyseus.js` client majors are out of sync. MVP pins the whole ecosystem to `0.16.x` (ADR 0005). Don't bump server past 0.16 without a matching client on npm.
- **Railway `npm ci` fails with `uWebSockets.js not in this registry`** — the lockfile's `resolved` URL drifted back to `git+ssh://`. Re-run `sed -i '' 's|git+ssh://git@github.com/uNetworking/uWebSockets.js.git|git+https://github.com/uNetworking/uWebSockets.js.git|g' package-lock.json` and re-commit. `npm ci` preserves the lockfile; `npm install` rewrites to SSH.
