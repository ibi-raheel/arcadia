# TavernScene

Interior room. Image-backed background (1536×1024 pixel art, user-supplied 2026-04-20; prior 1376×768 cyberpunk image retired) with a local avatar, Colyseus-synced remote peers, and a React chat overlay. No tile collision yet — the avatar walks freely within the image's physics-world rectangle. Colliders are a follow-up.

## Files

- `TavernScene.ts` — scene class. Renders `tavern-interior.png` as a depth-0 Image at origin (0, 0); reuses `LocalAvatar`, `RemoteAvatar`, `avatar-animations`, input resolvers, `move-throttle` from `scenes/world/`. Owns the speech-bubble machinery (see events below).
- `camera.config.ts` — zoom `1.0×` (bumped down from 1.365 on 2026-04-23 to show more of the room); rect-shaped `bounds` matching `TAVERN_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar `spawnPixel: { 768, 960 }` (2026-04-23: at the archway so the "Press ENTER to leave" prompt is visible on arrival — consistent with the market/square pattern), `size = 135×135` (bumped from 90×90 on 2026-04-22 for readability), feet-body `45×22` at `(22, 62)` in **frame units** — Phaser Arcade scales it to match `sprite.scale` automatically (see ADR 0008), walk speed 200.
- `layers.config.ts` — depth bands, y-sort config, empty colliders scaffold, and `TAVERN_EXIT_ARCHWAY` — a proximity zone at `(768, 960)` radius `150` now wired via `createEnterPromptManager` (ENTER-gated) rather than auto-fire. `TAVERN_RETURN_EDGE` is kept as an empty export for legacy import-compat.

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
- `TAVERN_OPEN_FEED_EVENT` *(Phase 9 · 2026-04-24)* — fired when the member is at the tablet (coords in `tavernSpritesConfig.tablet`) and presses ENTER. `GameTavern` → `TavernFeatures` listens and opens the `<FeedScroll>` modal. Ordered before the archway prompt in `update()` so a single ENTER consumes the nearer interactable.
- `create()` explicitly re-enables the keyboard at the end as defence-in-depth against race conditions where a stale blur/focus event arrives before the scene's listeners are set up.

## Controls (tavern)

- **W / A / S / D** or arrows — move.
- **Space** — one-shot jump animation (same as WorldScene).
- **Click** on floor — click-to-move.
- **Tab** — open chat bar + focus it (the bar is otherwise hidden). While focused, WASD types; Escape or Send closes.
- **ENTER near the bottom-centre archway** — walking into the archway's radius shows `Press ENTER to leave the Tavern`; ENTER fades + routes to `/tavern-outside?from=<buildingId>`. The member spawns AT the archway so the prompt is visible on arrival. The pulsing `↓ Exit ↓` text was removed 2026-04-23.

## Exit

The exit is an archway-proximity zone wired through `createEnterPromptManager` (ENTER-gated since 2026-04-23). The manager's `onFire` callback sends `MSG.LEAVE_BUILDING { building: 'tavern' }` before the camera fade starts, then the manager fades + navigates to `/tavern-outside?from=<buildingId>`. No more `checkArchwayExit()` method; `exitReturnRoute` / `exitFired` fields removed. The "Return to World" React button was removed 2026-04-22; the `↓ Exit ↓` in-world label was removed 2026-04-23 (the prompt pill is the only exit affordance now).

## Not owned here

- `ChatPanel` + `LeaderboardPanel` — React overlays mounted by `app/tavern/page.tsx` / `GameTavern`.
- Reactions UI — removed 2026-04-19 per user. Backend `toggle_reaction` RPC + RLS suite tests remain intact for a future re-introduction.

## Invariants

- BootScene's `NEXT_SCENE_KEY_REGISTRY_KEY` override = `'TavernScene'`. GameTavern writes it before Phaser boots.
- Image origin is (0, 0) top-left; avatar and physics-world coords are plain cartesian pixels inside `TAVERN_INTERIOR_SIZE`.
- `LocalAvatarOptions.spawnPixel` takes precedence over `spawnTile`. WorldScene still uses `spawnTile` for iso projection.
