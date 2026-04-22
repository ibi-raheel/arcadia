# 2026-04-22 — World swap: orthogonal town square on `/world` (ADR 0007 implemented)

The iso cyberpunk world on `/world` is retired. The new world is a 26×26 orthogonal top-down town square authored in Tiled, imported via `scripts/import-tiled-world.mjs` and rendered by `app/world-square-v3/GameWorldSquareV3.tsx`.

## What shipped

### Map
- **Source:** Tiled `square.tmj` (26×26 @ 64px, 19 embedded tilesets) imported to `apps/web/public/maps/arcadia-square-v3.tmj` + `public/tilesets-square-v3/*.png`. Orientation was `oblique` in the source export — the importer rewrites it to `orthogonal` (Phaser supports only orthogonal / isometric / staggered / hexagonal).
- **Layer model per ADR 0007:** terrain tile layers (grass / mossycobble / cobblestone) inside a group; decorations + fireflies on object layers. Oversized decor (trees 256, lamps 256, fountain 512, merchant 512, bridges 512, house 512, market stall 256) on object layers.
- **Rendering pattern:** `load.spritesheet` per tileset + explicit `gid − firstgid` frame picking + `+ map.tileHeight` y-shift + `setOrigin(0, 1)` + `setDepth(y)`. Documented in ADR 0007 §"Phaser wiring".

### Gameplay
- **Bridges as portals.** Any tileset whose name contains `bridge` is classified by quadrant. Current wiring: north → `/academy` (cyan neon), east → `/market` (amber neon), south → `/tavern` (pink neon). West bridge currently unassigned. Walking onto a mapped bridge camera-fades 300ms, then navigates.
- **Neon signs.** Pulsing Courier Bold text with coloured glow over a dark rounded-rect, positioned 40% toward map center from each bridge's geometric center so they sit over the inside entry point and stay inside the camera bounds.
- **Merchant NPC.** The `characters-ground-merchant` tileset is detected automatically. When the avatar enters a 220px radius, a word-cloud bubble pops up above the merchant's head with a random line from a 10-entry tip list.
- **Avatar layering.** `localAvatar.setDepth(1_000_000)` each frame so the player always draws above every prop.
- **Physics bounds** extended 512px past the map rect on every side so the avatar can step onto bridges that overhang the map edge — without this, the old hard wall fired before the entry trigger.

## What's paused

- **Colyseus presence on `/world`.** The new scene is single-player. Per-scene rooms (Tavern) still carry multiplayer — only the outdoor world lost it in this swap. Re-adding is a follow-up; the scene already has a `GameWorld`-equivalent Phaser mount so wiring `Client.joinOrCreate('world-realm1')` back in is a localised change.
- **Avatar onboarding gate on `/world`.** The old `GameWorld.tsx` redirected avatar-less members to `/onboarding/avatar`. The new page.tsx relies on middleware auth alone; onboarding-gate middleware still fires for routes that request it. If we need the redirect back, lift the avatar-fetch logic out of the legacy `GameWorld.tsx` into the new scene's wrapper.

## What's dead code now

- `apps/web/components/game/GameWorld.tsx` (iso mount + Colyseus wiring)
- `apps/web/components/game/scenes/world/**` (iso scene class + configs)
- `apps/web/public/maps/world.tmj` + `public/tilesets/world.png` (iso tilemap)

All still compile and their Vitest suites still pass — nothing imports them at runtime. Cleanup is a follow-up commit once the new world is stable on prod.

## Migration

No database migration. No schema change. No Colyseus protocol change. Purely a client-side route swap.

## Commit map

- `ed4a0c8` — last preview-branch commit (walkable bridges + market sign nudge)
- `0e9be6c` — `/world` swaps to the new scene
- merge commit for `world-square-v3-preview → main`

## Routes today

- `/` — landing
- `/world` — **new orthogonal square** (this commit)
- `/world-square-v3` — same scene, kept alive so preview URLs still work
- `/academy`, `/market`, `/tavern`, `/dashboard` — unchanged
