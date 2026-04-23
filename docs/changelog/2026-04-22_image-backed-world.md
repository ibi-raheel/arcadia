# 2026-04-22 — Image-backed world + outdoor areas + per-building Colyseus

Replaces the Tiled orthogonal town square (ADR 0007, shipped 2026-04-22 earlier today) with an image-backed Phaser scene at `/world`. Adds three new outdoor image-backed scenes + one new multiplayer interior. Each outdoor scene sits between the square and the existing interiors and uses a SPACE-prompt mechanic at building entrances. The three tavern doors and five coworking tents are now distinct Colyseus "buildings" that auto-shard at 20-person capacity.

## Routes

| Route | Colyseus | What |
|---|---|---|
| `/world` | `world-realm1` | Image-backed square. Four walk-onto edges: N→/academy-outside, E→/tavern-outside, S→/market, W→/coworking. |
| `/academy-outside` | — (single-player) | One SPACE-prompt gate → /academy. Return south → /world. |
| `/tavern-outside` | — (single-player) | Three SPACE-prompt tavern doors (`tavern-a/b/c`) → /tavern?b=…. Return west → /world. |
| `/coworking` | — (single-player) | Five SPACE-prompt tents (`tent-1..5`) → /coworking/inside?b=…. Return east → /world. |
| `/coworking/inside?b=<id>` | `coworking-realm1` (filterBy `building`) | Tent interior, multiplayer. |
| `/tavern?b=<id>` | `tavern-realm1` (filterBy `building`) | Tavern interior (unchanged visuals, now sharded per building). |

## Server changes (`apps/game-server`)

- `RealmRoom.maxClients` **50 → 20**. All three room types (`world`, `tavern`, `coworking`) auto-shard at 20.
- `gameServer.define('tavern-realm1', RealmRoom).filterBy(['building'])` — tavern now shards by the `building` option the client passes on join.
- New `gameServer.define('coworking-realm1', RealmRoom).filterBy(['building'])`.
- `ROOM_NAMES` allow-list extended to include `coworking-realm1`.
- `ROOM_CONFIGS['coworking-realm1']` added with 2508×2508 bounds and centre spawn.

## Client changes (`apps/web`)

- **New Phaser scenes**:
  - `scenes/square/` — image-backed, Colyseus on `world-realm1`, capacity HUD, 4 walk-onto edges.
  - `scenes/academy-outside/` — single-player, 1 SPACE-prompt + 1 return edge.
  - `scenes/tavern-outside/` — single-player, 3 SPACE-prompts + 1 return edge.
  - `scenes/coworking-outside/` — single-player, 5 SPACE-prompts + 1 return edge.
  - `scenes/coworking-inside/` — Colyseus on `coworking-realm1`, HUD, 1 return edge.
- **New shared helpers** (`scenes/shared/`):
  - `enter-prompt.ts` — proximity + SPACE prompt manager (handles SPACE-vs-jump coordination).
  - `edge-triggers.ts` — walk-onto fade + navigate.
  - `capacity-hud.ts` — top-right pill `"<label> · <n> / 20"`, graceful fade-in.
  - `outdoor-scene-base.ts` — abstract class the three outdoor scenes extend.
- **New mounts**: `GameSquare.tsx` (replaces `GameWorldSquareV3` at `/world`), `GameOutdoor.tsx` (three outdoor variants), `GameCoworkingInside.tsx`. `GameTavern.tsx` updated to read `?b=` and set the HUD label.
- **New images** in `public/worlds/`: square / academy-outside / tavern-outside / coworking-outside / coworking-inside (all 2508×2508 except coworking-outside at 2806×2242).
- **Avatar gate** extended (`lib/avatar-gate.ts`): the three new outdoor routes now require `memberships.avatar_id` before the scene mounts, same as `/world` and `/tavern`.
- **Shared protocol** (`@arcadia/shared`): `BuildingId` type adds `'coworking'` (for server-side LEAVE_BUILDING logging).

## Not changed

- Tiled files `public/maps/arcadia-square-v3.tmj`, `public/tilesets/*`, `components/game/scenes/world/**`, `app/world-square-v3/` — kept on disk, no longer routed. Pending cleanup once the image-backed world is verified on prod.
- `/academy`, `/market` interiors — same images, same logic. Only the ingress path changed (academy now via `/academy-outside`, market still directly from the square's south edge).

## Behaviour worth calling out

- **SPACE coordination**: inside an outdoor scene, SPACE inside a gate's proximity radius navigates; outside, SPACE jumps. Coordinated by `OutdoorSceneBase` in a single place so all three subclasses inherit identical behaviour.
- **21st person to the next shard**: Colyseus's matchmaker with `maxClients=20` + `filterBy(['building'])` transparently creates a fresh room for the same building when the current one fills. No client-side logic required.
- **Legacy deep links**: `/tavern` (no `?b=`) defaults to `tavern-a` so existing bookmarks land in a canonical building rather than a bucket of their own.
- **Leaving the tavern** goes to `/tavern-outside` (the building's front door) instead of bouncing all the way to `/world`. Symmetrical with coworking: leaving a tent returns to `/coworking`.

## Test coverage

- 10 new config-shape tests across the 5 new scene folders.
- 4 new enter-prompt tests (nearest-trigger math).
- 6 new edge-trigger tests (threshold band + priority).
- Avatar-gate tests extended to cover the 4 new auth-gated routes.
- 237/260 total tests pass (23 skipped are env-gated RLS tests).
