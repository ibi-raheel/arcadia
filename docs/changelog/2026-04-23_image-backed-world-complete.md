# 2026-04-23 — Image-backed world + outdoor neighbours: shipped

Wrapping up the `image-backed-outdoor-world` iteration, merged to `main` via PR #10. What started as "swap the Tiled square for an image to iterate faster" ended up being a broader restructuring of how the member moves through the world:

- `/world` is now an **image-backed Phaser scene** rendering `square-2508x2508.png` (no more Tiled at `/world`). Colyseus `world-realm1` re-added alongside a capacity HUD.
- **Three new outdoor neighbour scenes** sit between the square and the interiors: `/academy-outside`, `/tavern-outside`, `/coworking`. Each is single-player and uses the ENTER-key proximity prompt to move into its corresponding interior.
- **New `/coworking/inside`** multiplayer tent interior. Joins Colyseus `coworking-realm1` via `filterBy(['building'])` so each tent is its own social space.
- **Per-building Colyseus sharding** for tavern + coworking. `RealmRoom.maxClients = 20`; 21st member in a (room, building) bucket transparently lands in a fresh room.
- **Door-aware returns**: leaving a tavern drops the member back at that same tavern's door on `/tavern-outside` (carried via `?from=<buildingId>` query param).

## Routes live on prod

| Route | Colyseus | Kind |
|---|---|---|
| `/world` | `world-realm1` (auto-shards at 20) | Image-backed square, capacity HUD, 4 walk-onto edge portals |
| `/academy-outside` | — | Single-player outdoor area. ENTER at the gate → `/academy`. |
| `/tavern-outside` | — | 3 distinct tavern doors. ENTER at any → `/tavern?b=tavern-a/b/c`. |
| `/coworking` | — | 5 distinct tents. ENTER at any → `/coworking/inside?b=tent-1..5`. |
| `/academy` | — | Existing podium hall. "Return to World" now routes to `/academy-outside`. |
| `/tavern?b=<id>` | `tavern-realm1` + `filterBy(['building'])` | Existing bar. Exit is an archway-proximity portal at the bottom centre. |
| `/coworking/inside?b=<id>` | `coworking-realm1` + `filterBy(['building'])` | New tent interior. Walk off the bottom to return. |

## Behaviour worth calling out

- **ENTER for gates, SPACE for jump.** Early rounds used SPACE for both, which made jump feel broken inside any prompt radius. Decoupling keys made both feel natural.
- **Archway-proximity exits** beat edge-threshold exits when the visible door sits away from the actual image edge. Tavern's bottom-centre archway is a radius-150 zone; the avatar walks to it and the portal fires.
- **Per-scene transition overlays** are dimmed versions of the destination PNG with the location name on top. Every mount passes `displayName` + `backgroundImage` — `BuildingTransition` is now generic.
- **Avatar is bigger everywhere** — 135×135 in every scene, 202×202 on the square as the focal hub. Body offset stays at the frame-space values `(22, 62, 45, 22)` because Phaser auto-scales (see ADR 0008).
- **Nameplate** is a single "Name · Lv N" Georgia serif above the avatar, replacing the old separate name + level badge.

## What the iteration cost

21 commits across seven rounds of user feedback, including one architectural learning that became ADR 0008 (Phaser Arcade body auto-scaling — don't pre-scale bodyOffset). Overall diff: ~70 files changed, +3.5k / −1.2k LOC, five new scenes, five new shared helpers.

## Polish follow-ups (not blocking)

- **Legacy Tiled square cleanup** — `app/world-square-v3/`, `public/maps/arcadia-square-v3.tmj`, `public/tilesets-square-v3/` remain on disk but nothing imports them. Safe to delete once the image-backed world is stable on prod for a week.
- **Large PNGs** — 2508² and 2806×2242 images are ~9 MB each. Consider a build-time squoosh pass or serving the 1× variants to mobile clients.
- **Collider rects** — every new scene ships `colliders: []`. Author rects per scene once the art is final (same scaffold as tavern/market/academy).
- **Per-building tavern/coworking HUD capacity via `/rooms/:name/count`** — the HTTP endpoint was added in Phase 2 Step 13 for world+tavern; extend to accept a `building` filter.
- **Avatar-gate** extended to cover the new outdoor routes; `/academy` + `/market` remain gated at the server component level, not the middleware helper, which is a latent inconsistency.
