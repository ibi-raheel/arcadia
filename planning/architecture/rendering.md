# Rendering — Arcadia 2.5D isometric

**Status:** Phase 0 spike shipped. FPS validation on the user's dev machine pending.

Source of truth for the rendering approach is TAD §4 and ADR 0001. This doc captures *how* we implemented the spike (Phase 0 Step 19) and the measurement protocol for the 60 FPS PRD §5 criterion.

## 1. Approach

TAD §4.1 locks the rendering model:

- Phaser 3.88+ on `/apps/web`, loaded via `dynamic(..., { ssr: false })` to keep the browser-only globals out of Next.js's server render pass.
- Orthographic tilemaps at 64×32 (2:1 iso ratio). We do **not** use Phaser's `Tilemaps.Orientation.ISOMETRIC` — the iso "feel" is baked into the tileset art, applied to an ordinary orthogonal grid.
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
