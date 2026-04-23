# TavernOutsideScene

Single-player outdoor area east of the square. Three tavern buildings stacked vertically; each door is a distinct Colyseus "building" (`tavern-a`, `tavern-b`, `tavern-c`). All three doors lead to the same interior image, but members in different buildings are in different `tavern-realm1` rooms thanks to `filterBy(['building'])` on the game server.

## Files

- `TavernOutsideScene.ts` — thin `OutdoorSceneBase` subclass. Scene key + config assembly only.
- `camera.config.ts` — bounds match `public/worlds/tavernoutside-2508x2508.png`. Zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(220, 1254)` — 220px east of the west bridge (entry from /world).
- `layers.config.ts` — empty colliders; three entry triggers (approx y = 600 / 1280 / 1980 at x ≈ 1080); return edge on the left.
- `__tests__/configs.test.ts` — shape assertions + building-ID uniqueness.

## Controls

Same as academy-outside. SPACE inside any gate radius enters that specific tavern. Outside prompts, SPACE jumps.

## Invariants

- The three buildingId strings (`tavern-a/b/c`) are the source of Colyseus sharding — they MUST stay distinct. The URL-query param `?b=` on `/tavern` is parsed by `GameTavern.tsx` and passed to Colyseus as `{ building: '<id>' }`.
- No Colyseus in this scene itself — outdoor is single-player. The Colyseus room is joined only when the member enters `/tavern`.
