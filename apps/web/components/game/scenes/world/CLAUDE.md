# WorldScene

Outdoor isometric world. Owns the local avatar, keyboard + click-to-move + jump input, collision, y-sort, camera follow, and building entrance zones.

## Files

- `WorldScene.ts` — scene class. Imports configs; no hardcoded tweakable values.
- `camera.config.ts` — `{ zoom, followLerp, deadzone, bounds, fadeInMs, fadeOutMs }` + `WORLD_TILE_SIZE` + `WORLD_TILE_DIMENSIONS`.
- `sprites.config.ts` — avatar (spawnTile, size, bodyOffset, walkSpeed, clickArrivalThreshold), buildings (entranceTile, exitTile, footprintRect, fillColor per building).
- `layers.config.ts` — y-sort layer order, overlay layer names, depth bands.
- `local-avatar.ts` — `LocalAvatar` class. Two render paths: Phaser `Sprite` if the avatar's spritesheets are registered, else colored `Rectangle` placeholder. Owns direction + isMoving + isJumping state, display name text, level badge, `playAnim()`, `triggerJump()`.
- `input.ts` — pure input-math helpers: `resolveInputVelocity`, `resolveInputDirection`, `resolveClickTargetVelocity`, `velocityToFacingDirection`. All unit-testable without Phaser.
- `avatar-animations.ts` — `registerAvatarAnimations(scene)` creates one Phaser animation per `(avatarId, action, direction)` declared in `AVATAR_SHEETS`. `avatarHasSprite` / `primaryAvatarTextureKey` picked by LocalAvatar to choose Sprite vs Rectangle mode.
- `__tests__/` — config-shape + tilemap-sync assertions, input-math tests.

## Assets loaded (Phase 1)

- `public/maps/world.tmj` — 30×30 iso tilemap, 64×32 tiles.
- `public/tilesets/placeholder.png` — 3-tile (grass/path/wall) diamond-clipped PNG.
- `public/avatars/<avatar-id>/idle.png`, `walk.png`, `jump.png` per entry in `AVATAR_SHEETS` (boot/asset-manifest.ts). Shipping avatar-01 (Knight) today; other avatars fall back to the Rectangle.

## Synced with

- Supabase: reads `memberships.avatar_id` + `display_name` on scene start (via registry handshake set in `GameWorld.tsx`).
- Colyseus (Phase 2 Week 6+): joins `world-realm1` room, emits `MOVE` at 20 Hz, syncs `direction` + `isMoving` to `AvatarState`. The local state machine already matches that shape.

## Input

- WASD + arrow keys — velocity, cancels any pending click-target.
- Click on canvas — click-to-move target in world pixel space (`camera.getWorldPoint`). Velocity toward it until within `clickArrivalThreshold`.
- Spacebar — one-shot jump animation for current facing; blocks walk/idle override until `animationcomplete`.

## Key invariants

- Idle ↔ walk is a zero-delay `isMoving` toggle (no 2s timer).
- Collision comes from the tilemap `collision` layer; building Rectangles are visual-only.
- Body offsets / spawn tiles / walk speed / fade durations / arrival threshold all live in configs.
- Character facing is cardinal (n/e/s/w), from `velocityToFacingDirection`.

## Phase ownership

Created Phase 1 Step 1 as stubs. Populated Phase 1 Steps 6–16. Iso conversion + sprite pipeline + cardinal directions landed 2026-04-19. Phase 2 adds Colyseus wiring (remote avatars in the same y-sort registry, same animation keys driven by peer state).
