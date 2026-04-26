# WorldScene

> **NOT ROUTED ANY MORE (2026-04-22).** `/world` now renders `app/world-square-v3/GameWorldSquareV3.tsx` — the orthogonal town square per ADR 0007. The iso code below still compiles (and its tests still run) but no route imports it. Keep for reference until the follow-up cleanup commit removes it.

Outdoor isometric world. Owns the local avatar, keyboard + click-to-move + jump input, collision, y-sort, camera follow, and building entrance zones.

## Files

- `WorldScene.ts` — scene class. Imports configs; no hardcoded tweakable values.
- `camera.config.ts` — `{ zoom, followLerp, deadzone, bounds, fadeInMs, fadeOutMs }` + `WORLD_TILE_SIZE` + `WORLD_TILE_DIMENSIONS`. Current `zoom = 1.69` (2026-04-19 — 1.0 → 1.3 → 1.69 after the avatar-size halving to keep characters readable against the cyberpunk tileset).
- `sprites.config.ts` — avatar (`spawnTile`, `size = 32×32` halved 2026-04-19, `bodyOffset = 16×8` feet-box, `walkSpeed`, `clickArrivalThreshold`), buildings (entranceTile, exitTile, footprintRect, fillColor per building).
- `layers.config.ts` — y-sort layer order, overlay layer names, depth bands.
- `local-avatar.ts` — `LocalAvatar` class. Two render paths: Phaser `Sprite` if the avatar's spritesheets are registered, else colored `Rectangle` placeholder. Owns direction + isMoving + isJumping state + `playAnim()` / `triggerJump()` / `setFocus()` (Phase 12 — focus line above nameplate). **Phase 14 polish (PR #38 + #42):** the local player's nameplate (level badge + name) is hidden via `setVisualsNameplateVisible(visuals, false)` — the persistent HUD already shows the same info. Remote peers (`RemoteAvatar`) keep their nameplate visible; that's the only way to identify others in the room.
- `avatar-renderer.ts` — shared body + label rendering. Phase 12 added a second text label above the nameplate (`focusText` + `setVisualsFocus` helper) — used by every scene that mounts an avatar. Empty `currentFocus` keeps the label hidden; only the coworking tent's React overlay (`FocusPill`) currently writes to it via `MSG.SET_FOCUS`, but the field rides on every scene's avatars so peers see your focus everywhere. **Phase 14 polish (PR #42):** the nameplate is now `[circular Arc badge with gilt level digit][6 px gap][display name in JetBrains Mono]` centred under the avatar (was `Name · Lv N` in Georgia bold; PR #40 briefly used `(N) Name` parens before #42 swapped to the real Arc badge). Badge palette echoes the HUD shield: dark `--ink` fill, 1.5 px bronze stroke, gilt digit. `AvatarVisuals` exposes `levelBadge` + `levelText` + `nameText` separately; `setVisualsNameplateVisible` toggles all three together.
- `input.ts` — pure input-math helpers: `resolveInputVelocity`, `resolveInputDirection`, `resolveClickTargetVelocity`, `velocityToFacingDirection`. All unit-testable without Phaser.
- `avatar-animations.ts` — `registerAvatarAnimations(scene)` creates one Phaser animation per `(avatarId, action, direction)` declared in `AVATAR_SHEETS`. `avatarHasSprite` / `primaryAvatarTextureKey` picked by LocalAvatar to choose Sprite vs Rectangle mode.
- `__tests__/` — config-shape + tilemap-sync assertions, input-math tests.

## Assets loaded (Phase 1)

- `public/maps/world.tmj` — 30×30 iso tilemap, 64×32 grid spacing, 64×64 source tiles (extra 32px of source height draws above each cell for the cliff/elevation look).
- `public/tilesets/world.png` — 704×704 upscaled pixel-art tileset, 11×11 grid of 64×64 iso tiles (115 filled: dirt / grass / bushes / flowers / stumps / rocks / water).
- `public/avatars/<avatar-id>/idle.png`, `walk.png`, `jump.png` per entry in `AVATAR_SHEETS` (boot/asset-manifest.ts). Shipping today: avatar-01 (Knight, Aseprite export) + avatar-02 (LPC-standard female, cropped from the 13-column LPC generator output to match the knight's 2/9/5 column counts). Avatars 03–08 still fall back to the coloured Rectangle.

## Synced with

- Supabase: reads `memberships.avatar_id` + `display_name` on scene start (via registry handshake set in `GameWorld.tsx`).
- Colyseus (Phase 2 Week 6+): joins `world-realm1` room, emits `MOVE` at 20 Hz, syncs `direction` + `isMoving` to `AvatarState`. The local state machine already matches that shape.

## Input

- WASD + arrow keys — velocity, cancels any pending click-target.
- Click on canvas — click-to-move target in world pixel space (`camera.getWorldPoint`). Velocity toward it until within `clickArrivalThreshold`.
- Spacebar — one-shot jump animation for current facing; blocks walk/idle override until `animationcomplete`.

## Key invariants

- Idle ↔ walk is a zero-delay `isMoving` toggle (no 2s timer).
- Collision comes from the tilemap `collision` layer; building Rectangles are visual-only (and hidden since 2026-04-19 — see below).
- Body offsets / spawn tiles / walk speed / fade durations / arrival threshold / zoom all live in configs.
- Character facing is cardinal (n/e/s/w), from `velocityToFacingDirection`.
- **Avatar display size:** `32×32` via `setDisplaySize` (source sheets stay 64×64). **Camera zoom:** `1.69`. Tweak both together if you change one — see `camera.config.ts` + `sprites.config.ts` for the coupled history.

## Phase ownership

Created Phase 1 Step 1 as stubs. Populated Phase 1 Steps 6–16. Iso conversion + sprite pipeline + cardinal directions landed 2026-04-19. Phase 2 adds Colyseus wiring (remote avatars in the same y-sort registry, same animation keys driven by peer state).
