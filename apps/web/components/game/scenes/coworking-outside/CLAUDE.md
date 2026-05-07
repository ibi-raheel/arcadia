# CoworkingOutsideScene

> *Demo NPCs (PR #62 · 2026-05-06): when simulation mode is on, `NpcSwarm` (`../shared/npc-swarm.ts`) spawns **5 wandering NPCs** around the tent encampment at the player's `walkSpeed`. Wired via the `OutdoorSceneBase` parent. Sim off (default) = no NPCs.*

Single-player outdoor area west of the square. Five tent entrances arranged around a central campfire; each tent is a distinct Colyseus "building" (`tent-1` through `tent-5`). All tents lead to the same interior image but members in different tents are in different `coworking-realm1` rooms (sharded via `filterBy(['building'])`).

## Files

- `CoworkingOutsideScene.ts` — thin `OutdoorSceneBase` subclass.
- `camera.config.ts` — bounds match `public/worlds/coworkingoutside-2806x2242.png` (note: **not** square). Zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(2450, 1221)` — south of the east bridge (2026-04-24 tuning).
- `layers.config.ts` — empty colliders; **four** entry triggers as 200×200 square zones (tent-1/3/4/5; tent-2 removed 2026-04-24); return edge on the right routed `/world?from=coworking`; `COWORKING_OUTSIDE_DOOR_SPAWNS` map for `?from=<tentId>` continuity on return from the interior.
- `__tests__/configs.test.ts` — shape + building-ID uniqueness assertions (4 entries).

## Controls

Same as the other outdoor scenes. SPACE always jumps; ENTER inside any tent radius opens that tent's Colyseus room.

## Invariants

- Non-square image — width (2806) ≠ height (2242). Camera bounds + physics world must use the non-square rect, not a square approximation.
- `buildingId` strings MUST remain distinct — they are the Colyseus sharding key.
- No Colyseus in this scene itself.
