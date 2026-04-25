# SquareScene

Outdoor town square. Image-backed Phaser scene mounted at `/world` (replaces the Tiled orthogonal square at `app/world-square-v3/` as of 2026-04-22 — the Tiled files are retained on disk but no longer routed).

## Files

- `SquareScene.ts` — scene class. Renders `public/worlds/square-2508x2508.png` at origin (0, 0); Colyseus-synced local + remote avatars on top; four walk-onto edge triggers at the cardinal exits; capacity HUD top-right.
- `camera.config.ts` — zoom `1.0×`, 2508×2508 rect bounds, 200×150 deadzone, 400ms fade-in.
- `sprites.config.ts` — 202×202 avatar (50% bigger than every other scene so the square reads as the focal hub), spawn just south of the centre portal, 45×22 frame-space feet body (Phaser auto-scales — see ADR 0008), walk speed 325.
- `layers.config.ts` — empty collider array, y-sort depth bands, `SQUARE_EDGE_TRIGGERS` mapping top→/academy-outside, right→/tavern-outside, bottom→/market, left→/coworking, and **`SQUARE_LODGE_ENTRY`** (Phase 8) — a proximity trigger at the cabin in the top-right of the image (`centerX: 2250, centerY: 500, radius: 200`) that shows "Press ENTER to step into your lodge" and routes to `/`. Ordered before the edge triggers in `SquareScene.update` so a single ENTER press can't double-fire.
- `__tests__/configs.test.ts` — shape assertions per ADR 0004 + edge-trigger wiring.

## Assets loaded

- `public/worlds/square-2508x2508.png` — user-supplied top-down central square. Declared as `BOOT_ASSETS.squareOutside`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- Colyseus room `world-realm1`. Room type auto-shards once 20 clients join (see `apps/game-server/src/rooms/RealmRoom.ts` — `maxClients = 20`).
- Supabase: `memberships.avatar_id` + `display_name` + `realm_id` via the registry handshake set by `GameSquare.tsx` before Phaser boots.

## Edges

**ENTER-gated portals** (2026-04-23 Phase 7 G2). Each edge carries a `promptLabel`; walking into the 300 px band shows a prompt pill, only ENTER navigates. The east edge additionally carries `span: { min: 1050, max: 1500 }` so the Tavern prompt only fires on the east bridge, not along the full right wall.

**Return-spawn continuity.** Each sub-scene's return edge carries `?from=<origin>`. `GameSquare.tsx` reads the param and writes the matching entry from `SQUARE_RETURN_SPAWNS` to `SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY`; `SquareScene.createLocalAvatar` uses it instead of the default centre spawn:
- `?from=market` → south bridge `(1254, 2250)`
- `?from=academy` → north gate `(1254, 260)`
- `?from=tavern` → east gate `(2250, 1254)`
- `?from=coworking` → west bridge `(260, 1254)`

No `?from=` → default spawn at `(1254, 1380)`.

## Capacity HUD

Top-right pill reads `Square · <count> / 20`. Invisible until the first Colyseus state callback fires so it doesn't flash "0" during room join. Driven by `state.avatars.size` on each `onAdd` / `onRemove`.

## The Wanderer (NPC)

Bearded merchant baked into the upper-left of `square-2508x2508.png` (rug at ~x=355 y=620). On 2026-04-25 (Phase 11) the old random-tip Phaser bubble was retired in favour of an AI guide. Now:

- A `ProximityPromptManager` (same helper as the lodge entry / academy lectern) shows "Press ENTER to speak with the wanderer" when the avatar is within `SQUARE_NPC.proximityPx`.
- ENTER fires `SQUARE_OPEN_SAGE_EVENT` on the scene event bus.
- React `SageFeatures` (mounted by `GameSquare`) listens and opens the `SageDialogue` ScrollCard.
- Chat goes to `POST /api/sage/chat`, streamed Gemini Flash response grounded in the curated MVP doc corpus (`lib/sage/knowledge.ts`).
- Conversation persists in `localStorage` under `arcadia.sage.history` (capped 30 messages × 4k chars).

Sage is React-rendered, not Phaser — see ADR 0015. The Phaser side only owns proximity detection + the prompt pill.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Space** — one-shot jump (same as Tavern).
- Walking within 56px of any map edge — fade + navigate.

## Invariants

- Image origin is (0, 0) top-left; avatar and physics-world coords are plain cartesian pixels inside `SQUARE_IMAGE_SIZE`.
- Collision is the empty-array scaffold from ADR Phase-5 Step 15 — drop rects into `SQUARE_COLLIDERS` to activate without code changes.
- HUD max (20) mirrors `RealmRoom.maxClients`. If you change one, change the other.
