# CoworkingInsideScene

Multiplayer interior for coworking tents. Image-backed (`coworkinginside-2508x2508.png`). Joined via Colyseus `coworking-realm1` with `filterBy(['building'])` — members who entered the same tent on the outdoor scene share this room; members who entered different tents don't see each other even if they chose the same route.

## Files

- `CoworkingInsideScene.ts` — scene class. Image background + LocalAvatar + RemoteAvatars + y-sort + move-throttle sending. One walk-onto return trigger at the bottom-centre exit.
- `camera.config.ts` — 2508×2508 bounds, zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(1254, 1500)` near the central work table.
- `layers.config.ts` — empty colliders, return edge at bottom → `/coworking`.
- `__tests__/configs.test.ts` — shape + route assertions.

## Synced with

- Colyseus room type `coworking-realm1` (new 2026-04-22). `RealmRoom.maxClients = 20`; once a tent's room hits 20, Colyseus creates a fresh room with the same `{ building: <id> }` filter for the 21st member. Transparent to the client.
- Supabase: `memberships.*` via the registry handshake, same as Tavern.

## Capacity HUD

Pinned to the top-right, reads `"Tent N · <count> / 20"`. `N` is parsed from the `buildingId` string (`tent-3` → `"Tent 3"`). Driven by `room.state.avatars.size` on each `onAdd` / `onRemove`.

## Controls

- W/A/S/D or arrows — move
- Click on floor — click-to-move
- Space — jump
- Walk onto the bottom-centre exit — fade + back to `/coworking`

## Invariants

- The page component MUST set `registry[COWORKING_BUILDING_ID_REGISTRY_KEY]` before Phaser boots, so the HUD label renders correctly. It's pulled from the `?b=` query param.
- HUD max (20) mirrors `RealmRoom.maxClients`. Change both or neither.
- No chat today — add via React overlay later if the UX needs it.
