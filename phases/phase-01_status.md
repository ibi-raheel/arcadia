# Phase 1 — Status

Source plan: `phase-01_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-18 — Phase 1 kickoff

**Context:** Phase 0 code is done. Two Phase 0 user-action items (FPS spike measurement, optional Google OAuth) remain open. User chose to start Phase 1 with the FPS spike still pending — agreed because (a) Step 1 is a non-runtime structural change, and (b) the **placeholder-visuals decision** (user 2026-04-18) lowers the Phase 0 spike's urgency: Phase 1 rendering load with Rectangle primitives is trivially under the 60 FPS budget. Real-art 60 FPS validation shifted to whichever phase ships real sprites.

**Plan changes accepted today (pre-execution):**

- **Idle animation → zero delay.** Overrides `docs/mvp/phase-plan.md` §Phase 1 Week 4 which specified a 2s delay. `isMoving` is a same-frame toggle now; no timer. Captured in Locked decisions row "Idle trigger" and Step 16.
- **Placeholder visuals.** Avatars + buildings render as Phaser `Rectangle` primitives; tilemap ground uses a trivial 2-tile placeholder PNG. No avatar atlases, no real tilesets. Real art becomes a post-Phase-1 polish swap (file-level, scene code unchanged). Captured in new Locked decisions row "Placeholder visuals," Step 4 rewritten, Steps 5 / 9 / 12 / 13 / 16 updated to match.
- **Art delivery** no longer blocks Phase 1 — moved out of the carryovers list.

**Done — Step 1 (Game folder layout + per-scene config pattern):**

- Created folder structure:
  - `apps/web/components/game/scenes/boot/` (new)
  - `apps/web/components/game/scenes/world/__tests__/` (new)
  - `apps/web/components/game/scenes/shared/` (new)
  - Existing `apps/web/components/game/scenes/SpikeScene.ts` and `apps/web/components/game/SpikeGame.tsx` left untouched — Step 2 removes them.
- Wrote the game-level anchor: `apps/web/components/game/CLAUDE.md` — documents ADR 0004 convention, Phase 1 placeholder decision, expansion path (Tavern in Phase 2; Academy/Market never), scoping instructions for `claude` sessions, invariants.
- Wrote per-scene `CLAUDE.md` stubs (≤20-ish lines each per ADR 0004): `scenes/boot/`, `scenes/world/`, `scenes/shared/`.
- Wrote stub TS/TSX files with `export {};` placeholders so lint + typecheck stay clean while downstream steps populate content:
  - `scenes/boot/BootScene.ts` (populated Step 5)
  - `scenes/world/WorldScene.ts` (populated Step 7)
  - `scenes/world/camera.config.ts`, `sprites.config.ts`, `layers.config.ts` (populated Step 6)
  - `scenes/shared/iso-math.ts`, `types.ts` (populated as WorldScene needs them)
  - `components/game/GameWorld.tsx` — minimal `'use client'` stub returning `null` (populated Step 7+ as the React mount for WorldScene)
- `scenes/world/__tests__/.gitkeep` to keep the empty test dir tracked.

**Verification (Step 1 exit):**

- `npm run lint` — ✅ clean across all three workspaces
- `npm run typecheck` — ✅ clean across all three workspaces
- `npm run test` — ✅ 22 passed, 13 RLS skipped (expected: `TEST_SUPABASE_*` env missing locally — pass in CI with secrets)

Step 1 did not introduce any runtime behavior change; no manual deploy verification needed.

**Done — Step 2 (Remove `/spike` route + middleware allowlist entry):**

- Deleted `apps/web/app/spike/page.tsx`, `apps/web/components/game/SpikeGame.tsx`, `apps/web/components/game/scenes/SpikeScene.ts`.
- Removed `/spike` from `apps/web/middleware.ts` — dropped from `EXACT_PUBLIC_PATHS` set and from the header comment allowlist.

**Verification (Step 2 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ 22 passed, 13 RLS skipped (env-dependent)
- `cd apps/web && npm run build` — ✅ builds cleanly; route table shows 5 routes (`/`, `/_not-found`, `/api/health`, `/login`, `/signup`), `/spike` gone.
- No lingering `spike|Spike` references in code (`phases/*.md`, `README.md`, `CONTEXT.md` files, and older planning docs still reference it as historical context — left alone on purpose).

**Done — Step 3 (World tilemap design):**

- Created `apps/web/public/maps/` and `apps/web/public/tilesets/` directories.
- Hand-authored `apps/web/public/maps/world.tmj` via an inline Node script (Tiled `.tmj` is pure JSON — no GUI needed for the trivial placeholder layout). 30×30 grid, 64×32 tiles, 3 layers (`ground`, `collision`, `overlay`).
- **Orientation decision: `orthogonal`** rather than `isometric`. Rationale: simplest Phaser tilemap support; placeholder rectangles don't need diamond tessellation. When real iso-style art lands, we re-evaluate whether to switch orientation to `isometric` or `staggered` for true diamond tile tessellation. Flagged in plan's Risks as a follow-up; documented in `apps/web/components/game/CLAUDE.md` invariants.
- **Layout:**
  - Spawn at tile (15, 15), centre of map.
  - **Tavern** footprint: (5..9, 5..9), 5×5 solid collision block. Entrance tile at (7, 10) (south of footprint).
  - **Academy** footprint: (20..24, 5..9). Entrance at (22, 10).
  - **Market** footprint: (13..17, 20..24). Entrance at (15, 19).
  - Map-edge wall ring: 1-tile collision wall at x=0, x=29, y=0, y=29.
  - Paths (ground = tile 2) connect spawn to all three entrance tiles: vertical corridor x=15 (y=10..19) + horizontal corridor y=10 (x=7..22).
- **Tileset reference** in the `.tmj`: `placeholder.png` with 3 tiles (grass=1, path=2, wall=3), firstgid=1, tilecount=3. PNG lands in Step 4.

**Verification (Step 3 exit):**

- 20/20 structural assertions pass via an inline Node validation script: dimensions, orientation, layer names, all 3 layer data arrays length-correct, spawn-tile classification, all 3 building centres are walls, all 3 building entrance tiles are open + pathed, map-edge corners are walls.
- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ 22 passed, 13 RLS skipped (repo-root cwd — the Step 2 build left me in `apps/web/`, briefly ran only `@arcadia/web`'s tests; re-ran from root to confirm full workspace count).

**Done — Step 4 (Placeholder tileset PNG):**

- Wrote `scripts/generate-placeholder-tileset.mjs` — a pure-Node one-off generator for the placeholder PNG (uses `zlib.deflateSync` + `zlib.crc32`, no third-party deps). Committed alongside the PNG so the palette can be regenerated by tweaking the `TILES` array and re-running.
- Generated `apps/web/public/tilesets/placeholder.png` — **192×32 RGBA non-interlaced PNG, 236 bytes**. Three 64×32 tiles:
  - Tile 0 / gid 1 — grass, RGB (92, 168, 98)
  - Tile 1 / gid 2 — path, RGB (204, 178, 122)
  - Tile 2 / gid 3 — wall, RGB (72, 80, 92)
- **Path-hygiene incident caught + fixed:** the Step 3 `mkdir` and `.tmj` write landed at `apps/web/apps/web/public/` because the preceding `cd apps/web && npm run build` (Step 2 verification) had left the shell cwd inside `apps/web/`. Corrected by moving `world.tmj` to `apps/web/public/maps/` and removing the nested `apps/web/apps/` tree. **Lesson:** per CLAUDE.md, avoid `cd` — use absolute paths — or cd back explicitly. Going forward, Bash calls that follow a `cd` into a subdirectory now `cd /Users/aria/Documents/Arcadia` explicitly before doing anything path-relative.

**Verification (Step 4 exit):**

- `file` reports `PNG image data, 192 x 32, 8-bit/color RGBA, non-interlaced` — valid PNG.
- Byte-level parse of the PNG: signature OK, IHDR reports 192×32, IDAT decompresses, sampled pixel at each tile centre matches the configured RGB exactly — **3 tiles distinguishable.**
- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ 22 passed, 13 RLS skipped

**Done — Step 5 (BootScene):**

- Populated `apps/web/components/game/scenes/boot/BootScene.ts` — `Phaser.Scene` subclass with a `preload()` that loads the placeholder tileset + `world.tmj`, then `create()` starts WorldScene. Progress events emitted by Phaser's built-in `LoaderPlugin`; no explicit wiring needed here — the React loading screen subscribes from outside in Step 20.
- Split asset paths + scene-key constants into `scenes/boot/asset-manifest.ts` (not a `*.config.ts` per ADR 0004 — it lists assets to preload, not runtime-tweakable knobs). This lets unit tests validate paths + file existence **without** having to import Phaser (Phaser needs DOM globals that Vitest's node env doesn't provide).
- Updated `scenes/boot/CLAUDE.md` to reflect the two-file shape.
- **Config change:** extended `apps/web/vitest.config.ts` `include` pattern to pick up colocated unit tests under `components/**`, `app/**`, `lib/**`, and `middleware.test.ts`. Without this, per-scene `__tests__/*.test.ts` files (per ADR 0004) were silently skipped. `apps/web/tests/` still hosts the integration suites.
- Wrote `scenes/boot/__tests__/asset-manifest.test.ts` — 5 assertions covering: scene key stability, next-scene handoff string, declared asset paths, Phaser-texture-key uniqueness, on-disk file existence for every declared asset.

**Verification (Step 5 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ **27 passed, 13 RLS skipped (40 total)**. The 5 new BootScene asset-manifest tests are discovered and pass.
- `npm run build --workspace @arcadia/web` — ✅ builds cleanly. BootScene isn't yet imported from any Next route (wiring is Step 7 in `GameWorld.tsx`), so Phaser stays out of the server bundle.

**Done — Step 6 (Scene config files for World):**

- Populated `scenes/world/camera.config.ts` — `worldCameraConfig` with zoom, followLerp, deadzone, bounds, fadeInMs, fadeOutMs. `bounds` derives from exported `WORLD_TILE_DIMENSIONS` × `WORLD_TILE_SIZE` constants so a tilemap resize updates in one place.
- Populated `scenes/world/sprites.config.ts` — `worldSpritesConfig` with:
  - `avatar` — spawnTile (15, 15), size 32×48, bodyOffset (feet-only 24×16 at y=32), walkSpeed 160 px/s. **No `idleTimeoutMs`** (enforced by a negative assertion in the test).
  - `buildings` — entrance/exit tiles, footprintRect (pixel coords), fillColor per building. Uses `satisfies Record<BuildingName, …>` to bind to the shared `BuildingName` type while preserving literal inference.
- Populated `scenes/world/layers.config.ts` — tilemap layer names (`ground`/`collision`/`overlay`), strict depth ordering (ground=0 < collisionVisuals=10 < dynamic=1000 < overlay=2000), y-sort `yAnchorRatio = 0.5` matching TAD §4.1's `y + height/2` rule.
- Created `scenes/shared/avatar-palette.ts` — 8 stable `AVATAR_IDS`, Tailwind-500-family `AVATAR_COLORS`, `AvatarId` type, `isAvatarId` runtime guard. Shared with `/onboarding/avatar` React page (Step 10) per ADR 0004's cross-concern rule.
- Populated `scenes/shared/types.ts` — `Direction`, `BuildingName`, `TileCoord`, `PixelRect` unions.
- Wrote `scenes/world/__tests__/configs.test.ts` — **17 assertions** covering camera shape, sprites shape, layers shape, avatar palette (8 unique ids + colors), and a tilemap-sync section that parses `world.tmj` and cross-validates: camera bounds match tilemap extent, avatar spawn tile is walkable, every building entrance + exit tile is walkable (no collision wall). This caught a bug before it shipped — see below.
- Deleted `scenes/world/__tests__/.gitkeep` (no longer needed; real tests present).

**Bug caught during Step 6:** the Phase 1 plan's "Return transition" locked-decision row said exit tile = "one tile south of the entrance zone". This holds for Tavern + Academy (entrances face south of their footprints), but **Market's entrance is north of its footprint** — one tile south of (15, 19) is (15, 20), which is inside the Market footprint (collision wall). Fixed: Market's exit is (15, 18), one tile *north* of the entrance. The cross-validation test confirmed walkability for all 3 exits. Updated the plan's locked-decision row to describe the rule correctly ("one tile on the walkable side of the entrance").

**Verification (Step 6 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ **44 passed, 13 RLS skipped (57 total)**. 17 new WorldScene config tests discovered + passing.

**Done — Step 7 (WorldScene skeleton + React mount + `/world` route):**

- Populated `scenes/shared/iso-math.ts` with three pure helpers: `tileToPixel`, `tileCenterToPixel`, `pixelToTile`. Named "iso-math" per ADR 0004 but Phase 1's placeholder tilemap is orthogonal — real iso projection math lands (if at all) when real art lands and we decide between `orthogonal`/`isometric`/`staggered` orientations. Documented the naming + current scope in the file header.
- Wrote `scenes/shared/__tests__/iso-math.test.ts` — 7 assertions: origin mapping, scaling, round-trip tile↔pixel, fractional flooring, tile-boundary membership.
- Populated `scenes/world/WorldScene.ts` — `Phaser.Scene` subclass registered under key `"WorldScene"` (matches `NEXT_SCENE_KEY_AFTER_BOOT`). `create()` instantiates tilemap from the preloaded `world.tmj`, registers the placeholder tileset, creates the three tilemap layers with depth from `layers.config`, marks collision-layer tiles as colliding (`setCollisionByExclusion([0])`), and sets camera + physics-world bounds from `camera.config`. No hardcoded tweakables. Camera follow target wires in Step 12 when the avatar exists.
- Fleshed out `apps/web/components/game/GameWorld.tsx` — client component that instantiates a `Phaser.Game` with Arcade Physics enabled and `[BootScene, WorldScene]` registered. `useRef`+`useEffect` with cleanup (`game.destroy(true)` on unmount) to handle Next.js App Router's remount semantics on route changes. Container is `h-screen w-screen`.
- Created `app/world/page.tsx` — wraps `<GameWorld />` in `next/dynamic({ ssr: false })` per TAD §3.2 + shows a loading skeleton until the browser hydrates. Auth-gated by existing middleware (avatar gate lands in Step 11).

**Verification (Step 7 exit):**

- `npm run lint` — ✅ clean across all three workspaces
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ **51 passed, 13 RLS skipped (64 total)**. 7 new iso-math tests discovered + passing.
- `npm run build --workspace @arcadia/web` — ✅ builds cleanly. `/world` now in the route table (318 kB page, 405 kB first-load JS — Phaser's footprint is ≈300 kB, expected for a 2.5D iso engine). Route shows as `○` (static) because SSG only renders the "Loading world…" skeleton; `next/dynamic({ ssr: false })` defers actual Phaser instantiation to the browser.
- **Interactive visual verification deferred** — a running dev server + browser-driven sanity check is out of scope for this conversation. Will verify on Vercel preview after auth. Next visible check: after Step 12 lands the avatar, reviewing `/world` on deployed Vercel should show tilemap + spawn-tile placeholder Rectangle.

**Done — Step 8 (Y-sort implementation):**

- Wrote `scenes/shared/y-sort.ts` — pure `calculateYSortDepth(obj, config)` returning `depthBase + y + height * yAnchorRatio`. Takes the `YSortable` structural type (`{ y, height }`) and `YSortConfig` (`{ depthBase, yAnchorRatio }`). Kept scene-agnostic so TavernScene (Phase 2) imports the same function with its own config.
- Wrote `scenes/shared/__tests__/y-sort.test.ts` — 5 assertions: monotonicity (higher Y → higher depth → renders in front), exact formula (`y + height*ratio + base`), taller-at-same-y sorts slightly lower, depth-base offset is constant, boundary ratios (0 = sort by top, 1 = sort by bottom).
- Wired WorldScene: added a `ySortables: YSortableGameObject[]` registry, a `registerYSortable()` public method (Step 9 buildings + Step 12 avatar push into it), and an `override update()` that recomputes depth for every registered entry each frame using `worldLayersConfig.depth.dynamic` + `ySort.yAnchorRatio`. Registry is empty in Step 8 — infrastructure only.

**Typecheck gotcha caught + fixed:** Phaser's `Scene.update` is a public method, so TS `noImplicitOverride` flagged my `update()` with `TS4114`. Added `override` modifier.

**Verification (Step 8 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean (after `override` fix)
- `npm run test` — ✅ **56 passed, 13 RLS skipped (69 total)**. 5 new y-sort tests discovered + passing.
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` still 318 kB / 405 kB first-load.

**Done — Step 9 (Building placeholders + entrance zones):**

- Extended `scenes/shared/types.ts` to export `BUILDING_NAMES` as a tuple (`['tavern','academy','market'] as const`) with `BuildingName` derived from it. Mirrors the `AVATAR_IDS`/`AvatarId` pattern and lets loops stay type-safe.
- Added `WorldScene.createBuildingPlaceholders()`, called from `create()` after tilemap + camera setup. For each of the 3 buildings:
  - Phaser `Rectangle` at the footprint centre (dimensions + fill from `sprites.config.buildings.<name>.footprintRect`/`fillColor`), registered with `ySortables` so Step 8's update loop sorts it against the avatar once Step 12 lands.
  - Invisible `Phaser.GameObjects.Zone` at the entrance tile (size = one tile, position from `tileCenterToPixel(cfg.entranceTile, WORLD_TILE_SIZE)`), tagged via `setData('buildingName', name)` for Step 17's overlap callback, and attached as a static Arcade Physics body so `physics.add.overlap(avatar, zone)` works when Step 17 wires it.
- Rectangles are **visual only** per plan — collision geometry still comes from the tilemap `collision` layer (wall tiles marked in Step 7 via `setCollisionByExclusion([0])`), wired against avatar in Step 15.

**Verification (Step 9 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ 56 passed, 13 RLS skipped (69 total; test count unchanged — Step 9 is pure scene-construction code, not pure logic, so no new tests)
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` ticks up 1 kB first-load JS to 406 kB (building placeholder code).
- **Rationale for skipping a new unit test:** instantiating Phaser game objects requires a DOM — would force either jsdom environment or a Phaser stub harness. The building config is already asserted structurally by Step 6's `configs.test.ts`. Visual verification (Rectangle colors, zone tagging, y-sort participation vs. avatar) lands when the avatar does — Step 12 onward.

**Done — Step 10 (`/onboarding/avatar` page):**

- Created `app/onboarding/avatar/page.tsx` — `'use client'` component matching the login/signup page pattern (same Tailwind + Supabase browser-client idiom). 4×2 grid of colored swatches rendered from `AVATAR_COLORS` (scenes/shared/avatar-palette). Selected swatch shows a white border; Enter button disabled until something is picked; shows "Saving…" during the write.
- Write path: `supabase.auth.getUser()` → `memberships.update({ avatar_id }).eq('member_id', userId)` → `router.push('/world')`. Browser-side write permitted by the memberships RLS policy per TAD §6.2. No server action / API route.
- Uses the shared `AvatarId` type for type safety on `setSelected`.

**Verification (Step 10 exit):**

- `npm run lint` / `typecheck` / `test` — ✅ clean; 56 passed, 13 RLS skipped (test count unchanged — Step 10 is pure UI + DB write, tested via E2E not unit).
- `npm run build --workspace @arcadia/web` — ✅ `/onboarding/avatar` in the route table (1.48 kB, 151 kB first-load).
- Live E2E validation needs a deployed Vercel build + test account (deferred).

**Done — Step 11 (Entry-gate middleware):**

- Extracted the decision logic to `apps/web/lib/avatar-gate.ts` — pure `decideAvatarGate(input) → {kind:'pass'|'redirect', to?: '/world'|'/onboarding/avatar'}`. Plus `pathRequiresAvatarGate(pathname)` as an early exit so middleware skips the DB call on irrelevant requests (`/api/health`, `/login`, etc.).
- Extended `middleware.ts`: after existing session refresh + unauth redirect, for authed requests under `/world|/tavern|/onboarding/avatar`, `supabase.from('memberships').select('avatar_id').eq('member_id', user.id).maybeSingle()`, then call `decideAvatarGate`. Emits `NextResponse.redirect` if the decision says so; otherwise falls through to the existing response.
- Used `.maybeSingle()` so a missing membership (shouldn't happen given the signup trigger, but defensive) returns `null` rather than throwing.
- Wrote `lib/__tests__/avatar-gate.test.ts` — **11 assertions** across three groups: unauthed always passes; authed + null avatar_id → picker redirect (covering `/world`, `/tavern`, sub-paths, and allowlist of unrelated routes); authed + set avatar_id → `/world` bounce from the picker + pass on `/world`/`/tavern`. Separate group verifies `pathRequiresAvatarGate` whitelist (includes the gated paths, excludes `/login`, `/api/*`, `/onboarding` without `/avatar`, and the `/worldsomething` decoy to catch prefix-not-exact bugs).

**Verification (Step 11 exit):**

- `npm run lint` — ✅ clean
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ **67 passed, 13 RLS skipped (80 total)**. 11 new avatar-gate decision tests.
- `npm run build --workspace @arcadia/web` — ✅ clean. Middleware bundle ticked up from 79.6 → 79.8 kB (the avatar-gate import); `/world` and `/onboarding/avatar` still in the route table.

---

### Week 3 complete (Steps 1–11). Ready for Week 4 (Steps 12–16, avatar movement).

---

**Done — Step 12 (Local-avatar placeholder):**

- Extracted the avatar into `scenes/world/local-avatar.ts` as a `LocalAvatar` class (separate module so Steps 13–16 have a home for input / movement / state). Class owns: a Phaser `Rectangle` tinted per `AVATAR_COLORS[avatarId]`, an Arcade Physics dynamic body with feet-only bounds from `sprites.config.avatar.bodyOffset`, a display-name `Text` object clipped to 16 chars with white-on-black outline (TAD §4.3), a "Lv 1" level badge. Exposes `x`/`y`/`height` for the y-sort system; `direction`/`isMoving` accessors for Steps 13 + 16; `syncAttachments()` called per frame from `WorldScene.update()` to keep the name + badge glued to the Rectangle.
- Extended `WorldScene`: added `localAvatar`, `createLocalAvatar()` called from `create()` after building placeholders, camera `startFollow` + `setDeadzone` using `worldCameraConfig`. `update()` now also calls `syncAttachments()` before the y-sort depth recompute.
- Introduced a registry-handshake between React and Phaser: `MEMBER_REGISTRY_KEY` + `SceneMember` type exported from `WorldScene.ts`. GameWorld writes `{ avatarId, displayName }` into the registry before starting the game; WorldScene reads on `create()`.
- Extended `GameWorld.tsx` to fetch `memberships.avatar_id` + `display_name` via the browser Supabase client (same RLS scope that allowed the picker write) before instantiating Phaser.Game. Three-state UI — loading / error / ready — so an offline mount or missing-membership case renders a clear message instead of a broken canvas. `isAvatarId()` guard protects against schema drift (invalid `avatar_id` strings).

**Lint gotcha:** `import Phaser` in `local-avatar.ts` only uses Phaser as a type; ESLint `@typescript-eslint/consistent-type-imports` flagged it. Switched to `import type Phaser`.

**Verification (Step 12 exit):**

- `npm run lint` — ✅ clean (after type-only import fix)
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ 67 passed, 13 RLS skipped (80 total; count unchanged — Step 12 is Phaser construction, not unit-testable without a DOM)
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` now 319 kB / **468 kB first-load** (the bump from 406 → 468 kB is the Supabase browser client pulled into GameWorld for member fetch). `/onboarding/avatar` at 1.58 kB / 151 kB (imports the shared avatar-palette).

**Done — Step 13 (Keyboard movement):**

- Added `scenes/world/input.ts` with two pure functions: `resolveInputVelocity(input, speed)` and `resolveInputDirection(input, prev)`. Velocity normalises diagonals (√2 compensation) and cancels opposing keys. Direction preserves `prev` when no input is active, and resolves horizontal-over-vertical on diagonal combinations.
- Extended WorldScene: `wireKeyboardInput()` captures `createCursorKeys()` + WASD keys; `readInputState()` reads `.isDown` from both sets into a single `InputState`; `update()` feeds that into the resolvers and applies the result to `avatar.body.setVelocity(...)`. Direction and `isMoving` both written back to `localAvatar` each frame for Step 16 + Phase 2 Colyseus sync.
- Wrote `__tests__/input.test.ts` (later extended for Steps 14 + 16).

**Done — Step 14 (Click-to-move):**

- Extended `input.ts` with `resolveClickTargetVelocity(from, target, speed, threshold, prev)` — returns velocity toward target + arrival flag + inferred facing direction (dominant delta axis).
- Added `clickArrivalThreshold: 2` to `sprites.config.avatar`. Kept the plan's "within 2 px" rule as a typed config knob rather than a magic literal.
- Wired pointer input: `wirePointerInput()` listens for `'pointerdown'` and stores the world-space target (`camera.getWorldPoint`). WorldScene.update() now has a three-branch priority: keyboard → click-target → idle. Keyboard input wins and clears the pending target; click-target drives velocity until arrival; otherwise zero velocity + `isMoving = false`.
- Collision is handled by Arcade Physics — since click-to-move goes through `body.setVelocity` (not direct position tween), wall collisions naturally halt forward progress.

**Done — Step 15 (Collision):**

- Added `physics.add.collider(avatar.rect, this.collisionLayer)` in `createLocalAvatar()`. Collision-layer tiles were already marked solid in Step 7 via `setCollisionByExclusion([0])`; world-bounds collision was set in `LocalAvatar`'s constructor. Step 15 was the single wiring call that ties them together.

**Done — Step 16 (Movement state machine — zero delay):**

- Semantics already enforced through Steps 13 + 14: `isMoving` is derived from input intent each frame (`true` if keyboard velocity nonzero OR click-target active + not arrived; `false` otherwise). There is no timer anywhere. This is additionally guarded by Step 6's negative assertion against any `idleTimeoutMs` key.
- Added an explicit sequence test in `input.test.ts` ("Step 16 zero-delay state machine…") that flips input on/off across three frames and confirms `isMoving` tracks immediately.
- Semantic decision (documented here, not in code comments): `isMoving` reflects **input intent**, not physics reality. If the avatar is bumping into a wall with the right arrow held, `isMoving === true` — this matches what Phase 2's Colyseus `AvatarState.isMoving` needs to drive remote walk animations.

**Verification (Steps 13–16 exit, combined):**

- `npm run lint` — ✅ clean across all three workspaces
- `npm run typecheck` — ✅ clean
- `npm run test` — ✅ **80 passed, 13 RLS skipped (93 total)**. 13 new tests across input + click-target + zero-delay sequence.
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` still 319 kB / 469 kB first-load (input module is tiny).
- Interactive verification (walking around, clicking, hitting walls, smooth arrival) requires a browser and is deferred to the Vercel deploy.

---

### Week 4 complete (Steps 12–16). Ready for Week 5 (Steps 17–21, building navigation + polish).

---

**Done — Step 17 (Building-entrance overlap handler):**

- Added `buildingZones: Map<BuildingName, Zone>` to WorldScene and stored zones there as they're created in Step 9's loop. Added `isTransitioning` flag + `onBuildingEntry(name)` method.
- In `createLocalAvatar()` (after the collision-layer collider), wired `physics.add.overlap(avatar.rect, zone, () => onBuildingEntry(name))` for each of the 3 building zones.
- `onBuildingEntry(name)`: guards against re-entry via `isTransitioning`, zeros avatar velocity + clears click-target, triggers `camera.fadeOut(fadeOutMs, 0, 0, 0)`, and on `Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE` reads the React `NavigateFn` from the registry and calls `navigate(\`/\${name}\`)`.
- Exposed `NAVIGATE_REGISTRY_KEY` + `NavigateFn` type from WorldScene.ts for GameWorld to write to.

**Done — Step 18 (Building page shells):**

- Created three Next.js routes: `app/tavern/page.tsx`, `app/academy/page.tsx`, `app/market/page.tsx`. Each renders a shared `<BuildingShell>` component (`components/BuildingShell.tsx`) parameterised by `{ name, title, comingInPhase }`. Layout: header with title, centred "Coming in Phase N…" placeholder, footer with "Return to World" link to `/world?from=<name>`. All three auth-gated via existing middleware; visible in the build route table.
- Shell is pure React (no Phaser scene) per TAD §4.2 — Tavern will gain a Phaser scene in Phase 2; Academy/Market remain React-only forever.

**Done — Step 19 (Return-to-world flow):**

- Added `SPAWN_FROM_REGISTRY_KEY` to WorldScene.ts and `isBuildingName` type guard to `scenes/shared/types.ts`.
- Extended `LocalAvatar` options with an optional `spawnTile` override; constructor falls back to `sprites.config.avatar.spawnTile` if not given.
- `WorldScene.createLocalAvatar()` now reads `SPAWN_FROM_REGISTRY_KEY` from the registry; if present, passes `worldSpritesConfig.buildings[spawnFrom].exitTile` to `LocalAvatar`.
- GameWorld uses `useSearchParams` to read the `?from=` query param, validates against `isBuildingName`, and writes to the registry before Phaser boots. `next/dynamic({ ssr: false })` avoids the usual `Suspense` requirement for `useSearchParams`.
- Camera fade-in was already set up in Step 7's `create()` — works for both first-load and building returns.

**Done — Step 20 (World loading screen):**

- Added `PROGRESS_CALLBACK_REGISTRY_KEY` to `scenes/boot/asset-manifest.ts`. BootScene's `preload()` reads this callback from the game registry and subscribes to Phaser's built-in `LoaderPlugin` `progress` + `complete` events, forwarding to the callback.
- Extracted `components/game/WorldLoadingScreen.tsx` — absolutely-positioned overlay with the Realm name ("mvp-realm" for Phase 1), a progress bar bound to the 0..1 value, and an indeterminate pulse state when progress is `null`. Accessible (`role="progressbar"`, `aria-valuenow`).
- GameWorld tracks `preloadProgress: number | null` in state; sets a registry callback that calls `setPreloadProgress` on every Phaser progress event; initialises to `0` the moment Phaser.Game is instantiated. Rendering: the canvas container is always mounted behind the overlay (`relative` parent, `absolute inset-0` children); the overlay shows while `fetchState.status === 'loading' || preloadProgress === null || preloadProgress < 1`.

**Done — Step 21 (Final polish pass):**

- **Magic-numbers audit:** grepped `WorldScene.ts` for numeric literals. All remaining numbers are non-tweakable semantics — tilemap origin `(0, 0)`, tile-encoding `0` for empty, velocity-stop `setVelocity(0, 0)`, RGB-black `fadeIn/Out(ms, 0, 0, 0)` (per plan Step 17 spec), and `width/2`/`height/2` center-math. All adjustable values (zoom, lerp, spawn tile, walk speed, body offsets, click arrival threshold, building coords, fade durations, avatar colors) live in `*.config.ts` or `avatar-palette.ts`. Phase 1 exit criterion met.
- **Prettier sweep:** `npm run format:check` flagged 16 files with formatting drift. Ran `npm run format` to fix; re-ran `format:check` green.
- **Layering / collision-gap / spawn visual verification deferred** — these need a running browser. Will be part of the Vercel deploy validation (user action).

---

### Phase 1 CODE COMPLETE — all 21 steps done. Final state:

**Test suite: 80 passed, 13 RLS skipped (93 total)** — up from 22 passed at Phase 0 exit. New test files added in Phase 1:
- `components/game/scenes/boot/__tests__/asset-manifest.test.ts` (5)
- `components/game/scenes/shared/__tests__/iso-math.test.ts` (7)
- `components/game/scenes/shared/__tests__/y-sort.test.ts` (5)
- `components/game/scenes/world/__tests__/configs.test.ts` (17)
- `components/game/scenes/world/__tests__/input.test.ts` (12)
- `lib/__tests__/avatar-gate.test.ts` (11)

**Build green** — all workspaces typecheck, lint clean, Prettier clean, Next.js production build succeeds. `/world` route 320 kB / 470 kB first-load (Phaser + Supabase); `/onboarding/avatar`, `/tavern`, `/academy`, `/market`, `/login`, `/signup` all in the route table.

### Phase 1 exit criteria — status

| Criterion | Status |
|---|---|
| Per-scene folder structure + per-folder `CLAUDE.md` | ✅ game-level + 3 scene folders in place; ADR 0004 convention live |
| Config-driven scene (no tweakable literals in WorldScene.ts) | ✅ magic-number grep audit clean |
| `/onboarding/avatar` picker + `memberships.avatar_id` write | ✅ page shipped; RLS permits the browser-side write |
| Middleware avatar gate | ✅ 11 decision-logic assertions pass; middleware calls decision function after DB lookup |
| Keyboard + click-to-move + normalised diagonals | ✅ 8 velocity tests + 4 click-target tests |
| Collision (tilemap + world bounds) | ✅ wired; visual verification on deploy |
| Y-sort ordering (dynamic band) | ✅ 5 depth tests + per-frame WorldScene.update |
| Building transitions (fade-out → navigate → fade-in → exit-tile spawn) | ✅ wired; visual verification on deploy |
| Movement-state machine (zero delay) | ✅ explicit sequence test + negative `idleTimeoutMs` assertion |
| Placeholder visuals (8 avatar Rectangle colors, 3 building Rectangles, tileset PNG) | ✅ runtime rendering in place |
| CI remains green | ⏳ will confirm on next push (no reason it shouldn't) |
| End-to-end demo run on deployed Vercel | ⏳ **user action**: deploy + sign in + walk through all 3 buildings |
| 60 FPS on Chrome 6× CPU throttle | ⏳ **user action**: measure on deployed Vercel in browser with throttle on |

### Remaining items before Phase 1 can formally "exit"

1. **Push + deploy to Vercel.** CI runs, Vercel picks up the build, `/world` becomes live for auth'd members.
2. **E2E run on deployed URL.** Register (or use existing account) → picker → world → walk to each building → return → observe correct spawn positioning + collision + y-sort. Screen capture to `planning/architecture/rendering.md` §6.
3. **60 FPS measurement.** Chrome DevTools 6× CPU throttle; record frame-time trace during an active walk. Fill `rendering.md` §5.
4. **Phase 0 carryovers (still open).** FPS spike measurement (which Step 21's placeholder decision made less urgent) + optional Google OAuth.

Phase 1 code is ready for your review + deploy.

---

## 2026-04-19 — Iso conversion + sprite pipeline + jump

Post-"Phase 1 code complete" work done the same night. Branch `phase-01-code-complete` now has 7 commits on top of main. The scene renders from an actual-isometric tilemap with user-authored character sprites rather than the placeholder Rectangle + orthogonal grid the plan originally scoped.

**Landed:**

- **True iso tilemap (commit `bc736df`).** `world.tmj` `orientation: "isometric"`; `iso-math.ts` rewritten for `screenX = (tX - tY) * TW/2`, `screenY = (tX + tY) * TH/2`; `camera.config` bounds derived from the iso diamond extent. Placeholder tileset regenerated as diamond-clipped tiles.
- **2:1 AoE flat-diamond tiles (commit `c626310`).** Initial iso pass used 32×32 (square rotated 45° — looked top-down). Switched to 64×32 (AoE-authentic ~30° pitch). Zoom reset to 1.0; camera bounds + building footprints recomputed.
- **Avatar spritesheet pipeline (commit `3353e62`).** `AVATAR_SHEETS` registry in `asset-manifest.ts`; BootScene loops and registers every declared sheet; new `avatar-animations.ts` creates one Phaser animation per `(avatar, action, direction)`. LocalAvatar picks Sprite or Rectangle at construction based on whether a sheet is registered — Rectangle-placeholder fallback stays for avatars without art. `scripts/crop-spritesheet.mjs` reusable helper (pngjs devDep) trims padded-column exports from Aseprite.
- **Phaser namespace import (commit `366b2db`).** `phaser@3.88` ESM build has no default export; dev-mode SWC failed on `import Phaser from 'phaser'`. Switched the 3 value-import files to `import * as Phaser from 'phaser'` — production build was lenient, dev mode is strict.
- **Cardinal facing + walk + jump sheets (commit `56f1dc8`).** User-supplied sprites use 4 cardinal poses per row (N/W/S/E), not iso diagonals as initially assumed. `IsoDirection` renamed to `FacingDirection`; `velocityToIsoDirection` (quadrant bucketer) → `velocityToFacingDirection` (dominant-axis cardinal bucketer). `AvatarAction` extended from `'idle'|'run'` to `'idle'|'walk'|'jump'`. `AvatarSheet` gains `repeat` so jump plays once (`0`) while idle/walk loop (`-1`). Ingested walk (576×256, 9×4) + jump (320×256, 5×4) sheets for avatar-01.
- **Spacebar jump (commit pending).** `LocalAvatar.triggerJump(direction)` plays the one-shot jump animation, listens for `animationcomplete`, clears `_isJumping`. WorldScene captures SPACE key (with `addCapture('SPACE')` to stop browser page-scroll), fires on `Phaser.Input.Keyboard.JustDown` so holding space doesn't restart mid-jump, and gates walk/idle playback while jumping.
- **Character naming (commit pending).** `AVATAR_NAMES` map in `avatar-palette.ts` — avatar-01 → "Knight", others → fantasy placeholder names (Rogue / Mage / Ranger / …). Onboarding picker swatch labels now show the name rather than the raw `avatar-0N` ID.
- **Middleware matcher (folded into `bc736df`).** Added `tmj|json` to the static-asset exclusion regex so Phaser's tilemap fetch doesn't 307 through `/login`.
- **All CLAUDE.md files updated** to describe the iso rendering model, the avatar pipeline, cardinal directions, the spacebar jump, and the Phaser namespace-import invariant.

**Verification:** lint + typecheck + Prettier + Vitest (85 passed, 13 RLS skipped = 98 total) + `next build` all green. Dev server runs clean with all three avatar sheets served (idle 128×256, walk 576×256, jump 320×256).

**Live in-browser** on `/world` for avatar-01 users: diamond-tile iso world, knight sprite walks cardinal directions with 12 fps walk cycle, spacebar triggers one-shot jump animation matching the current facing.

**Deps added:** `pngjs` + `@types/pngjs` as devDeps (used only by `scripts/crop-spritesheet.mjs`; no runtime bundle footprint).

**Still pending before formal Phase 1 exit:**

- Deploy this branch to Vercel preview + run the end-to-end walk-through on the deployed URL.
- 60 FPS measurement on Chrome 6× CPU throttle.
- Phase 0 carryovers (still open): FPS spike run + optional Google OAuth.

---

### Phase 1 exit criteria — status

See `phase-01_plan.md` for the full criteria list. Current status (Step 1 only):

| Criterion | Status |
|---|---|
| Game folder structure + per-scene CLAUDE.md scoping | ✅ folders, stubs, and anchor CLAUDE.md in place |
| Per-folder CLAUDE.md smoke test (scoping `claude` to a scene folder works) | ⏳ becomes testable once scenes have real content (Step 5+) |
| All other criteria | ⏳ downstream steps |
