# TavernScene

Interior room. Image-backed background (1376×768 cyberpunk pixel art) with a local avatar, Colyseus-synced remote peers, and a React chat overlay. No tile collision yet — the avatar walks freely within the image's physics-world rectangle. Colliders are a follow-up.

## Files

- `TavernScene.ts` — scene class. Renders `tavern-interior.png` as a depth-0 Image at origin (0, 0); reuses `LocalAvatar`, `RemoteAvatar`, `avatar-animations`, input resolvers, `move-throttle` from `scenes/world/`. Owns the speech-bubble machinery (see events below).
- `camera.config.ts` — zoom `1.05×` (zoomed out 30% from the original 1.5× on 2026-04-20); rect-shaped `bounds` matching `TAVERN_INTERIOR_SIZE` (1376×768).
- `sprites.config.ts` — avatar `spawnPixel: { 688, 620 }` (bottom-centre of the image), `size = 64×64` (2× WorldScene's 32×32; 2026-04-20, matches the native spritesheet frame so no upscaling), feet-body `32×16` at `(16, 44)`, walk speed.
- `layers.config.ts` — depth bands only (ground/dynamic/decor); tilemap layer names retained but unused since the image-backed swap.

## Assets loaded

- `public/tavern-interior.png` — 1376×768 cyberpunk bar interior, user-supplied 2026-04-19. Declared via `BOOT_ASSETS.tavernInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.
- `public/maps/tavern.tmj` is still preloaded but unused in-scene — harmless; enables a one-line rollback if we ever want the procedural iso tavern back. Delete when we're confident the image is permanent.

## Synced with

- Colyseus room `tavern-realm1` (separate from `world-realm1`). Connection is a fresh `ColyseusConnection` owned by `GameTavern` (mirrors `GameWorld`).
- Supabase: reads `memberships.avatar_id` + `display_name` + `realm_id` via the shared registry handshake, same as WorldScene.

## React ↔ scene events (on `game.events`)

- `TAVERN_SPEECH_EVENT` — emitted by `useTavernChat` on every new message (own optimistic echo + peer Realtime INSERT). Scene shows (or replaces) a speech bubble above the speaker's avatar for 5 s. Bubble follows the avatar each frame via `update()`.
- `TAVERN_CHAT_FOCUS_EVENT` / `TAVERN_CHAT_BLUR_EVENT` — emitted by `ChatPanel` when the chat bar opens/closes. Scene toggles `this.input.keyboard.enabled` so WASD types letters while the bar is open rather than also moving the avatar. Pointer click-to-move is also gated while the keyboard is disabled.
- `create()` explicitly re-enables the keyboard at the end as defence-in-depth against race conditions where a stale blur/focus event arrives before the scene's listeners are set up.

## Controls (tavern)

- **W / A / S / D** or arrows — move.
- **Space** — one-shot jump animation (same as WorldScene).
- **Click** on floor — click-to-move.
- **Tab** — open chat bar + focus it (the bar is otherwise hidden). While focused, WASD types; Escape or Send closes.

## Not owned here

- `ChatPanel` + `LeaderboardPanel` — React overlays mounted by `app/tavern/page.tsx` / `GameTavern`.
- "Return to World" floating button — React overlay. Must fire `MSG.LEAVE_BUILDING { building: 'tavern' }` before routing (handled in `GameTavern`).
- Reactions UI — removed 2026-04-19 per user. Backend `toggle_reaction` RPC + RLS suite tests remain intact for a future re-introduction.

## Invariants

- BootScene's `NEXT_SCENE_KEY_REGISTRY_KEY` override = `'TavernScene'`. GameTavern writes it before Phaser boots.
- Image origin is (0, 0) top-left; avatar and physics-world coords are plain cartesian pixels inside `TAVERN_INTERIOR_SIZE`.
- `LocalAvatarOptions.spawnPixel` takes precedence over `spawnTile`. WorldScene still uses `spawnTile` for iso projection.
