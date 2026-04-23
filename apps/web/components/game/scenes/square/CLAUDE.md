# SquareScene

Outdoor town square. Image-backed Phaser scene mounted at `/world` (replaces the Tiled orthogonal square at `app/world-square-v3/` as of 2026-04-22 — the Tiled files are retained on disk but no longer routed).

## Files

- `SquareScene.ts` — scene class. Renders `public/worlds/square-2508x2508.png` at origin (0, 0); Colyseus-synced local + remote avatars on top; four walk-onto edge triggers at the cardinal exits; capacity HUD top-right.
- `camera.config.ts` — zoom `1.0×`, 2508×2508 rect bounds, 200×150 deadzone, 400ms fade-in.
- `sprites.config.ts` — 202×202 avatar (50% bigger than every other scene so the square reads as the focal hub), spawn just south of the centre portal, 45×22 frame-space feet body (Phaser auto-scales — see ADR 0008), walk speed 325.
- `layers.config.ts` — empty collider array, y-sort depth bands, and `SQUARE_EDGE_TRIGGERS` mapping top→/academy-outside, right→/tavern-outside, bottom→/market, left→/coworking.
- `__tests__/configs.test.ts` — shape assertions per ADR 0004 + edge-trigger wiring.

## Assets loaded

- `public/worlds/square-2508x2508.png` — user-supplied top-down central square. Declared as `BOOT_ASSETS.squareOutside`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- Colyseus room `world-realm1`. Room type auto-shards once 20 clients join (see `apps/game-server/src/rooms/RealmRoom.ts` — `maxClients = 20`).
- Supabase: `memberships.avatar_id` + `display_name` + `realm_id` via the registry handshake set by `GameSquare.tsx` before Phaser boots.

## Edges

Walk-onto portals (no prompt). The edge-trigger manager (`scenes/shared/edge-triggers.ts`) compares the avatar's world pos against a 56px threshold on each edge; first hit fires a 300ms camera fade and `window.location.href = route`. Once fired, the trigger is sticky — subsequent overlaps no-op so navigation can't be cancelled mid-fade.

## Capacity HUD

Top-right pill reads `Square · <count> / 20`. Invisible until the first Colyseus state callback fires so it doesn't flash "0" during room join. Driven by `state.avatars.size` on each `onAdd` / `onRemove`.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Space** — one-shot jump (same as Tavern).
- Walking within 56px of any map edge — fade + navigate.

## Invariants

- Image origin is (0, 0) top-left; avatar and physics-world coords are plain cartesian pixels inside `SQUARE_IMAGE_SIZE`.
- Collision is the empty-array scaffold from ADR Phase-5 Step 15 — drop rects into `SQUARE_COLLIDERS` to activate without code changes.
- HUD max (20) mirrors `RealmRoom.maxClients`. If you change one, change the other.
