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

## World rendering model (current — image-backed, 2026-04-22 evening)

- **Central scene** — `SquareScene` at `/world` renders `public/worlds/square-2508x2508.png` as a flat image background (no Tiled). Colyseus on `world-realm1` (re-added 2026-04-22). 2508×2508 bounds; avatar **202×202** (the square is the one "focal" scene — every other image-backed scene runs the avatar at **135×135**); zoom 0.6. Four walk-onto edge triggers wire cardinal exits:
  - N → `/academy-outside` (image-backed single-player)
  - E → `/tavern-outside` (image-backed single-player, 3 SPACE-prompt tavern doors)
  - S → `/market` (unchanged interior)
  - W → `/coworking` (image-backed single-player, 5 SPACE-prompt tents)
- **Outdoor scenes** — `AcademyOutsideScene`, `TavernOutsideScene`, `CoworkingOutsideScene` all extend `scenes/shared/outdoor-scene-base.ts`. Each has empty colliders + entry triggers + one return edge. No Colyseus (single-player).
- **New interiors** — `CoworkingInsideScene` mirrors TavernScene shape (image background, LocalAvatar + RemoteAvatars, move-throttle) but joins `coworking-realm1` with `filterBy(['building'])` so each tent is its own social space.
- **Per-building Colyseus sharding** — `RealmRoom.maxClients = 20`. Both `tavern-realm1` and `coworking-realm1` are `filterBy(['building'])`; the client passes `{ building: '<id>' }` as a join option (derived from `?b=` in the URL). Once a (room, building) pair hits 20 clients, Colyseus transparently spawns a fresh room for the same filter. See `docs/changelog/2026-04-22_image-backed-world.md`.
- **Capacity HUD** — top-right pill on every Colyseus-backed scene: `<label> · <count> / 20`. Invisible until the first state callback so it doesn't flash during room join.

## Legacy Tiled square (pre-2026-04-22 evening)

- `app/world-square-v3/GameWorldSquareV3.tsx` + `public/maps/arcadia-square-v3.tmj` + `public/tilesets/*.png` rendered the morning's orthogonal Tiled square. No longer imported at runtime — kept on disk for reference. Delete candidate once the image-backed world is verified on prod.
- Pattern to preserve if we ever revive Tiled: the "seven-rule" wiring (load.spritesheet + explicit gid-firstgid frame picking + y-shift + origin(0,1) + setDepth(y)). See ADR 0007.

## Legacy iso world (pre-2026-04-22)

- Old 30×30 isometric map (Tiled `orientation: "isometric"`), `WorldScene.ts` + `GameWorld.tsx`, 64×32 (2:1) AoE-flat diamond grid. **No longer routed** — the old code + its tests still compile but nothing imports them. Cleanup is a follow-up commit once the orthogonal world is stable on prod.
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

- **Phase 2 Week 7** → `scenes/tavern/` — interior tilemap, Colyseus-synced remote avatars, chat is a React overlay (not a scene object). Shipped.
- ~~**Academy and Market** — never get a Phaser scene.~~ Superseded: both DO have Phaser scenes now (`scenes/academy/` and `scenes/market/`) — see the 2026-04-22 inline TAD amendment in their `CLAUDE.md` files. Phase 8 simplified them: each has a single central interactable (book / crystal) with a proximity prompt that opens a React scroll modal (`LedgerScroll` / `CatalogScroll`). No more per-course/per-stall floating cards in-scene.
- **V2 customisable worlds** — per-creator scenes follow the same folder convention. Config-driven appearance already aligns.

## React overlays driven by Phaser events

Five surfaces follow the same pattern: Phaser owns the proximity / interaction detection in scene code, fires a named event on the scene's event bus, and a React component mounted by the corresponding `Game<Scene>.tsx` listens and opens an overlay (ScrollCard, modal, panel). Use this pattern for any new React UI that needs in-world triggering — never re-render UI inside Phaser.

| Scene | Event | Listener | Opens |
|---|---|---|---|
| `tavern` | `tavern:open-feed` | `TavernFeatures` | `FeedScroll` (Phase 9) |
| `academy` | `academy:open-ledger` | `LedgerScroll` host | `LedgerScroll` (Phase 8) |
| `market` | `market:open-catalog` | `CatalogScroll` host | `CatalogScroll` (Phase 8) |
| `square` | `square:open-sage` | `SageFeatures` | `SageDialogue` (Phase 11) |
| `tavern` | `tavern:speech` / `tavern:chat-focus` / `tavern:chat-blur` | TavernScene | speech bubbles + keyboard capture toggle |

Pattern details: poll `gameRef.current` every 500 ms until Phaser mounts (refs aren't reactive); attach the listener once; clean up on unmount. See `components/tavern/TavernFeatures.tsx` for the canonical implementation.

## Phase 8 · UI wire-up touches (2026-04-24)

Non-aesthetic scene changes landed with the React-surface rebuild:

- **AcademyScene** — `renderPodiums()` removed. `renderLectern()` draws a floating red-bound book with gilt halo at scene centre; proximity prompt `ACADEMY_OPEN_LEDGER_EVENT` opens the React `LedgerScroll` modal.
- **MarketScene** — `renderStalls()` + `applyFilter` + `StallVisuals` + `MARKET_FILTER_EVENT` all removed. `renderCrystal()` draws a floating blue crystal; proximity prompt `MARKET_OPEN_CATALOG_EVENT` opens the React `CatalogScroll` modal. Stall picks write `?course=<id>` so the existing `StallView` opens.
- **SquareScene** — new `SQUARE_LODGE_ENTRY` proximity trigger at the cabin in the top-right routes to `/` on ENTER.
- **`shared/proximity-prompt.ts`** — new helper. Same visual pill as `enter-prompt` but the ENTER handler is a callback, not a navigation.
- **Prompt pill visual** — restyled in scriptorium voice (IM Fell English italic + vellum on night + bronze double border). Applies to both `enter-prompt` and `proximity-prompt` pills.

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
- **Chat input swallows W/A/S/D/Space** — Phaser's `addKeys(...)` defaults `enableCapture=true`, which registers captures on the **game-level `KeyboardManager`** and calls `preventDefault()` at the DOM keydown listener *independent* of the scene plugin's `enabled` flag. Setting `scene.input.keyboard.enabled = false` alone is not enough — also call `clearCaptures()` on chat focus and re-add via `addCapture('W,A,S,D,SPACE')` on blur. See `TavernScene.disableKeyboardInput` / `enableKeyboardInput`.
- **Railway `npm ci` fails with `uWebSockets.js not in this registry`** — the lockfile's `resolved` URL drifted back to `git+ssh://`. Re-run `sed -i '' 's|git+ssh://git@github.com/uNetworking/uWebSockets.js.git|git+https://github.com/uNetworking/uWebSockets.js.git|g' package-lock.json` and re-commit. `npm ci` preserves the lockfile; `npm install` rewrites to SSH.
