# TavernScene

Interior room. Local avatar, Colyseus-synced remote peers, no building-entrance zones. "Return to World" is a React overlay button, not a scene object. Chat + leaderboard overlays land Week 8.

## Files

- `TavernScene.ts` — scene class. Mirrors WorldScene structure; reuses `LocalAvatar`, `RemoteAvatar`, `avatar-animations`, input resolvers, move-throttle from `scenes/world/`.
- `camera.config.ts` — zoom 1.5×, iso-diamond bounds for a 15×15 map.
- `sprites.config.ts` — avatar spawn tile (inside the north entrance), body offsets, walk speed.
- `layers.config.ts` — tilemap layer names + depth bands.

## Assets loaded

- `public/maps/tavern.tmj` — 15×15 iso interior (entrance at col 7, row 0). Generator: `scripts/generate-tavern-tmj.mjs`.
- Reuses `public/tilesets/world.png` — no new art in Week 7.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- Colyseus room `tavern-realm1` (separate from `world-realm1`). Connection is a fresh `ColyseusConnection` owned by `GameTavern` (mirrors `GameWorld`).
- Supabase: reads `memberships.avatar_id` + `display_name` via the shared registry handshake, same as WorldScene.

## Not owned here

- Chat panel + leaderboard sidebar — React overlays in `app/tavern/page.tsx`, wired Week 8.
- "Return to World" control — React overlay (not a scene object). Must fire `MSG.LEAVE_BUILDING { building: 'tavern' }` before routing.

## Invariants

- BootScene's `NEXT_SCENE_KEY_REGISTRY_KEY` override = `'TavernScene'`. GameTavern writes it before Phaser boots.
- `tavern.tmj` uses `orientation: "isometric"` with 64×32 tile spacing — same as world.
