# Rendering — Arcadia 2.5D isometric

**Status:** Phase 1 shipped to main 2026-04-19. The approach below was revised during Phase 1 — see §0 "2026-04-19 update" first. The original Phase 0 spike content (§1 onward) is preserved as historical reference.

---

## 0. 2026-04-19 update — Phase 1 revisions

The Phase 0 spike used **orthogonal** Tiled orientation with iso-style art. Phase 1 switched to **true isometric** tilemap orientation (user decision during iso conversion — square diamond tiles felt too top-down; AoE-flat 2:1 diamonds needed real iso projection math).

Current rendering model (on `main`):

- `apps/web/public/maps/world.tmj` → `orientation: "isometric"`, 30×30 cells, `tilewidth: 64`, `tileheight: 32` (map grid spacing).
- Tileset: `apps/web/public/tilesets/world.png`, 704×704, 11×11 grid of 64×64 source tiles (upscaled 2× from a 32×32 pixel-art pack). Source tile height 64 vs. map grid height 32 means each tile's top 32px draws above its cell — gives the grass-on-dirt "cake slice" elevation look.
- Scene classes in `apps/web/components/game/scenes/world/` (see ADR 0004 per-scene folder convention).
- Iso projection math in `scenes/shared/iso-math.ts`: `screenX = (tileX - tileY) * 32; screenY = (tileX + tileY) * 16`. Tested round-trip in `__tests__/iso-math.test.ts`.
- Y-sort via `scenes/shared/y-sort.ts` — dynamic objects (avatar, building placeholder Rectangles) get `depth = dynamicBase + y + height * yAnchorRatio` each frame. Tilemap layers render at fixed depths (ground = 0 < collisionVisuals = 10 < overlay = 500 < dynamic = 1000) so short decorations render under the avatar.
- Camera: `pixelArt: true` in the Phaser game config — nearest-neighbor filtering keeps pixel-art crisp at any zoom. Follow-lerp 0.1, deadzone 160×120.
- Phaser imports use namespace form (`import * as Phaser from 'phaser'`) — the ESM build has no default export, dev-mode SWC rejects `import Phaser from 'phaser'`.
- Character facing is cardinal (n/e/s/w) — sprites were drawn with 4 cardinal poses, not iso diagonals. `velocityToFacingDirection` in `scenes/world/input.ts` does dominant-axis bucketing.

60 FPS validation (PRD §5) is **deferred** (user decision 2026-04-19) — placeholder + minimal-tileset measurement wouldn't be load-bearing; re-measure after real art fully lands. The §4 measurement protocol below is the template; `/spike` was removed in Phase 1, so the measurement is now done against `/world` directly.

The rest of this doc (§1 onward) describes the Phase 0 spike. Kept for historical reference — individual paragraphs no longer describe current code state.

---

## 1. Approach (Phase 0 — superseded; see §0)

TAD §4.1 originally suggested:

- Phaser 3.88+ on `/apps/web`, loaded via `dynamic(..., { ssr: false })` to keep the browser-only globals out of Next.js's server render pass.
- Orthographic tilemaps at 64×32 (2:1 iso ratio). We do **not** use Phaser's `Tilemaps.Orientation.ISOMETRIC` — the iso "feel" is baked into the tileset art, applied to an ordinary orthogonal grid. *[Superseded in Phase 1 — true iso orientation now used.]*
- Depth sorted by `sprite.y` every frame (with origin pinned at `(0.5, 1)` so the sort key matches the sprite's feet).
- No true 3D — no z-axis, no depth buffer. Everything is 2D painter's algorithm with a per-sprite depth set from `y`.

## 2. What the spike validates

Phase 0 Step 19, at `apps/web/app/spike/page.tsx`:

| Concern | How the spike exercises it |
|---|---|
| Phaser bundles in Next.js 14 App Router | `dynamic(..., { ssr: false })` wrapper mounts Phaser only on the client. |
| Tilemap rendering | 10×10 orthogonal grid populated from a `number[][]` with procedurally-generated tile textures. |
| Sprite rendering | Two 48×64 placeholder avatars. |
| Y-sort correctness | Avatars animate on the y-axis every frame (`sin`/`cos`), forcing the render order to flip repeatedly. Depth is re-applied in `update()` on every tick. |
| FPS under continuous animation | `game.loop.actualFps` sampled every frame; minimum captured after a 3-second warmup. |

The spike deliberately uses procedurally-generated art (`Phaser.Graphics.generateTexture`). Real iso-style tileset art + 8 avatar atlases are the Phase 1 Week 3 delivery per `docs/art/sprite-requirements.md`.

## 3. What the spike does NOT validate

- **Multiplayer sync** (Phase 2): Colyseus integration is separate. The spike has one scene, no rooms, no network.
- **Real iso visual quality** (Phase 1): Phase 0 ships rectangles, not iso diamonds. The rendering pipeline works; the art arrives next phase.
- **True mid-range hardware** (PRD §5): the spike is measured on the dev Mac Mini M4 with Chrome DevTools CPU 6× throttle as a proxy. True validation on a real mid-range laptop (8 GB RAM, integrated GPU) is deferred to pre-Loom in Phase 5.

## 4. FPS measurement protocol

Exit criterion from `phases/phase-00_plan.md`:

> Isometric spike sustains 60 FPS for 60 continuous seconds while both avatars move, under Chrome DevTools 6× CPU throttling as the mid-range proxy.

### Steps

1. Start the dev server: `npm run dev --workspace=@arcadia/web`, OR visit the production URL: `https://arcadia-web-swart.vercel.app/spike`.
2. Open Chrome DevTools → Performance panel → gear icon → CPU: **6× slowdown**. Keep the devtools panel OPEN throughout the test (closing it resets throttling).
3. Leave the page in focus for at least 63 seconds (3-second warmup + 60-second measurement window).
4. Read the `min` value from the overlay. It should show **60** after the full window.
5. Screenshot the overlay at the end and save it in this folder as `rendering-spike-<YYYY-MM-DD>.png`.

### Pass / fail

- **Pass:** `min 60` after 60+ seconds → approach confirmed. Phase 1 proceeds against this rendering pipeline.
- **Fail (< 60):** record the minimum, the browser / hardware, and open a new ADR in `planning/decisions/` before starting Phase 1. The fallback is not currently in scope — a fix requires re-evaluating Phaser-on-orthographic vs. alternative engines.

## 5. Measurement log

Fill one row per run. Throttled = "Chrome DevTools CPU 6× on Mac Mini M4"; leave unthrottled and "real mid-range laptop" rows for later.

| Date | Environment | Min FPS | Frames | Notes | Screenshot |
|---|---|---|---|---|---|
| *pending* | Mac Mini M4, Chrome X, 6× throttle | — | — | First spike run | — |
| *pending* | Mac Mini M4, Chrome X, no throttle | — | — | Unthrottled reference | — |
| *pending* | Real mid-range laptop (TBD) | — | — | Phase 5 pre-Loom | — |

## 6. Follow-ups (post Phase 0)

- Replace procedural textures with real iso tileset (Phase 1 Week 3).
- Add camera follow-avatar with smooth lerp + world-bounds clamp (Phase 1 Week 3).
- Integrate Colyseus so `SpikeScene`'s pattern informs the real `WorldScene` + `TavernScene` (Phase 2 Week 6).
- Remove `/spike` from the middleware public allowlist once testing is no longer needed in production.
