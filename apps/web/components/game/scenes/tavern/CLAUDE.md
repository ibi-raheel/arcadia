# TavernScene

Interior room. Image-backed background (1536×1024 pixel art, user-supplied 2026-04-20; prior 1376×768 cyberpunk image retired) with a local avatar, Colyseus-synced remote peers, and a React chat overlay. No tile collision yet — the avatar walks freely within the image's physics-world rectangle. Colliders are a follow-up.

## Files

- `TavernScene.ts` — scene class. Renders `tavern-interior.png` as a depth-0 Image at origin (0, 0); reuses `LocalAvatar`, `RemoteAvatar`, `avatar-animations`, input resolvers, `move-throttle` from `scenes/world/`. Owns the speech-bubble machinery (see events below).
- `camera.config.ts` — zoom `1.0×` (bumped down from 1.365 on 2026-04-23 to show more of the room); rect-shaped `bounds` matching `TAVERN_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar `spawnPixel: { 768, 300 }` (top-centre — member walks south through the room to the archway exit), `size = 135×135` (bumped from 90×90 on 2026-04-22 for readability), feet-body `45×22` at `(22, 62)` in **frame units** — Phaser Arcade scales it to match `sprite.scale` automatically (see ADR 0008), walk speed 200.
- `layers.config.ts` — depth bands, y-sort config, empty colliders scaffold, and `TAVERN_EXIT_ARCHWAY` — a proximity exit zone at `(768, 960)` radius `150` that fires the portal back to `/tavern-outside` when the avatar walks into it (replaces the old bottom-edge threshold that tripped halfway across the room).

## Assets loaded

- `public/tavern-interior.png` — 1536×1024 bar interior, user-supplied 2026-04-20 (prior 1376×768 cyberpunk version retired). Declared via `BOOT_ASSETS.tavernInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.
- `public/maps/tavern.tmj` is still preloaded but unused in-scene — harmless; enables a one-line rollback if we ever want the procedural iso tavern back. Delete when we're confident the image is permanent.

## Synced with

- Colyseus room type `tavern-realm1` with `filterBy(['building'])` *(2026-04-22)*. The client passes `{ building: '<id>' }` (from `?b=` on the URL) — Colyseus groups clients with the same building into the same room. `RealmRoom.maxClients = 20`; a 21st arrival for the same building spawns a fresh room transparently. Legacy `/tavern` links with no `?b=` default to `building = 'tavern-a'` (see `GameTavern.tsx` → `DEFAULT_BUILDING_ID`).
- Supabase: reads `memberships.avatar_id` + `display_name` + `realm_id` via the shared registry handshake, same as WorldScene.

## Capacity HUD

Pinned to the top-right, reads `"Tavern <letter> · <count> / 20"`. `<letter>` comes from the `buildingId` registry (e.g. `tavern-a` → `"Tavern A"`). Updates live via `room.state.avatars.size` on each `onAdd`/`onRemove`.

## React ↔ scene events (on `game.events`)

- `TAVERN_SPEECH_EVENT` — emitted by `useTavernChat` on every new message (own optimistic echo + peer Realtime INSERT). Scene shows (or replaces) a speech bubble above the speaker's avatar for 5 s. Bubble follows the avatar each frame via `update()`.
- `TAVERN_CHAT_FOCUS_EVENT` / `TAVERN_CHAT_BLUR_EVENT` — emitted by `ChatPanel` when the chat bar opens/closes. Scene toggles `this.input.keyboard.enabled` so WASD types letters while the bar is open rather than also moving the avatar. Pointer click-to-move is also gated while the keyboard is disabled.
- `create()` explicitly re-enables the keyboard at the end as defence-in-depth against race conditions where a stale blur/focus event arrives before the scene's listeners are set up.

## Controls (tavern)

- **W / A / S / D** or arrows — move.
- **Space** — one-shot jump animation (same as WorldScene).
- **Click** on floor — click-to-move.
- **Tab** — open chat bar + focus it (the bar is otherwise hidden). While focused, WASD types; Escape or Send closes.
- **Walk into the bottom-centre archway** — fades + routes to `/tavern-outside?from=<buildingId>`. The pulsing "↓ Exit ↓" marker is drawn in the scene directly above the archway.

## Exit

The exit is an archway-proximity zone (not a bottom-edge threshold). `TavernScene.checkArchwayExit()` fires once per frame while `!exitFired`, comparing the avatar's `(x, y)` against `TAVERN_EXIT_ARCHWAY`. On fire: sends `MSG.LEAVE_BUILDING { building: 'tavern' }` via Colyseus, fades the camera, navigates to `/tavern-outside?from=<buildingId>` so the outdoor scene spawns the member at the same tavern's door. The old React "Return to World" button was removed 2026-04-22.

## Not owned here

- `ChatPanel` + `LeaderboardPanel` — React overlays mounted by `app/tavern/page.tsx` / `GameTavern`.
- Reactions UI — removed 2026-04-19 per user. Backend `toggle_reaction` RPC + RLS suite tests remain intact for a future re-introduction.

## Invariants

- BootScene's `NEXT_SCENE_KEY_REGISTRY_KEY` override = `'TavernScene'`. GameTavern writes it before Phaser boots.
- Image origin is (0, 0) top-left; avatar and physics-world coords are plain cartesian pixels inside `TAVERN_INTERIOR_SIZE`.
- `LocalAvatarOptions.spawnPixel` takes precedence over `spawnTile`. WorldScene still uses `spawnTile` for iso projection.
