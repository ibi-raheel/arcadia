# WorldScene

Outdoor isometric world. Owns the local avatar, keyboard + click-to-move input, collision, y-sort, camera follow, and building entrance zones.

## Files

- `WorldScene.ts` — scene class. Imports configs; no hardcoded tweakable values.
- `camera.config.ts` — `{ zoom, followLerp, deadzone, bounds, fadeInMs, fadeOutMs }`
- `sprites.config.ts` — `{ avatar, avatarColors (8 placeholder colors), buildings (entranceTile, exitTile, footprintRect, fillColor per building) }`
- `layers.config.ts` — y-sort layer order, overlay layer names
- `__tests__/` — y-sort ordering unit test, config-shape assertions

## Assets loaded (Phase 1)

- `public/maps/world.tmj` (30×30 iso tilemap)
- `public/tilesets/placeholder.png`
- Avatars + buildings are Phaser `Rectangle` primitives — no external art.

## Synced with

- Supabase: reads `memberships.avatar_id` on scene start to pick the avatar color.
- Colyseus (Phase 2 Week 6+): joins `world-realm1` room, emits `MOVE` at 20 Hz, syncs `direction` + `isMoving` to `AvatarState`.

## Key invariants

- Idle ↔ walk is a zero-delay `isMoving` toggle (no 2s timer).
- Collision comes from the tilemap `collision` layer; building Rectangles are visual-only.
- Body offsets / spawn tiles / walk speed / fade durations all live in configs.

## Phase ownership

Created Phase 1 Step 1 as a stub. Populated Phase 1 Steps 6–16. Phase 2 adds Colyseus wiring.
