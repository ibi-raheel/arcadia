# CoworkingInsideScene

> *Demo NPCs (PR #62 · 2026-05-06): when simulation mode is on, `NpcSwarm` (`../shared/npc-swarm.ts`) spawns **5 coworkers** in the tent at the player's `walkSpeed`. **Locked at 5** (deliberately less crowded than the outdoor + hub scenes since the focus-pill UX competes for nameplate attention). Sim off (default) = no NPCs.*

Multiplayer interior for coworking tents. Image-backed (`coworkinginside-2508x2508.png`). Joined via Colyseus `coworking-realm1` with `filterBy(['building'])` — members who entered the same tent on the outdoor scene share this room; members who entered different tents don't see each other even if they chose the same route.

## Files

- `CoworkingInsideScene.ts` — scene class. Image background + LocalAvatar + RemoteAvatars + y-sort + move-throttle sending. One walk-onto return trigger at the bottom-centre exit; two `ProximityPromptManager`s (jukebox + chest) firing `coworking:open-jukebox` / `coworking:open-hourglass` on `game.events`. Listens for the `arcadia:local-focus-changed` window event and forwards to `localAvatar.setFocus` so the local nameplate stays in sync with server state (the local avatar isn't in its own state-subscription path, so this bridge is needed).
- `camera.config.ts` — 2508×2508 bounds, zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(1254, 1500)` near the central work table.
- `layers.config.ts` — empty colliders, return edge at bottom → `/coworking`. Six `COWORKING_INTERACTABLES` baked over the PNG (jukebox + chest active in 12.A; table / bookshelf / easel / banner reserved for 12.B). ADR 0016 covers why these are typed consts vs Tiled object layers.
- `__tests__/configs.test.ts` — shape + route assertions.

## Synced with

- Colyseus room type `coworking-realm1` (new 2026-04-22). `RealmRoom.maxClients = 20`; once a tent's room hits 20, Colyseus creates a fresh room with the same `{ building: <id> }` filter for the 21st member. Transparent to the client.
- Supabase: `memberships.*` via the registry handshake, same as Tavern.

## Capacity HUD

Pinned to the top-right, reads `"Tent N · <count> / 20"`. `N` is parsed from the `buildingId` string (`tent-3` → `"Tent 3"`). Driven by `room.state.avatars.size` on each `onAdd` / `onRemove`.

## Phase 12 productivity surfaces (React overlays)

All driven by Phaser events on `game.events`; React side mounted by `GameCoworkingInside` via `<CoworkingFeatures>`. See `apps/web/components/coworking/CLAUDE.md` for the React-side overview.

| Object (PNG) | Coords | Event | Opens |
|---|---|---|---|
| Jukebox (right wall) | `(1820, 1100)` r=220 | `coworking:open-jukebox` | `JukeboxOverlay` — 4 stations, shared station + per-tab volume |
| Wooden chest (top-right) | `(1700, 560)` r=200 | `coworking:open-hourglass` | `HourglassOverlay` — 3 Pomodoro presets, server-clock ticker |

State syncs via the existing Colyseus room: `state.jukebox` (JukeboxState) + `state.pomodoro` (PomodoroState) + per-avatar `state.avatars[i].currentFocus` (AvatarState extension). Top-centre `PomodoroBanner`, top-right `HearthPill`, top-left `FocusPill` all read off this state.

## Controls

- W/A/S/D or arrows — move
- Click on floor — click-to-move
- Space — jump
- **ENTER near the bottom exit** — walking into the 300 px bottom band shows `Press ENTER to exit the Tent`; only ENTER fades + navigates to `/coworking?from=<tentId>` so the outdoor scene spawns the member back at that tent's door (continuity). Shipped 2026-04-24. Replaces the walk-onto exit + the React `← Leave tent` button. `LEAVE_BUILDING` fires from the edge-trigger's `onFire` callback (pre-fade).
- **ENTER near the jukebox** (right wall) — opens station picker. Phase 12.A.
- **ENTER near the wooden chest** (top-right) — opens Pomodoro hourglass. Phase 12.A.

## Invariants

- The page component MUST set `registry[COWORKING_BUILDING_ID_REGISTRY_KEY]` before Phaser boots, so the HUD label renders correctly. It's pulled from the `?b=` query param.
- HUD max (20) mirrors `RealmRoom.maxClients`. Change both or neither.
- No chat today — add via React overlay later if the UX needs it.
