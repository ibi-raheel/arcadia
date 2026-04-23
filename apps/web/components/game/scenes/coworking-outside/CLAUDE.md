# CoworkingOutsideScene

Single-player outdoor area west of the square. Five tent entrances arranged around a central campfire; each tent is a distinct Colyseus "building" (`tent-1` through `tent-5`). All tents lead to the same interior image but members in different tents are in different `coworking-realm1` rooms (sharded via `filterBy(['building'])`).

## Files

- `CoworkingOutsideScene.ts` — thin `OutdoorSceneBase` subclass.
- `camera.config.ts` — bounds match `public/worlds/coworkingoutside-2806x2242.png` (note: **not** square). Zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(2606, 1121)` — 200px west of the east bridge.
- `layers.config.ts` — empty colliders; five entry triggers (top-left / top-right / left / right / bottom-centre tents); return edge on the right.
- `__tests__/configs.test.ts` — shape + building-ID uniqueness assertions.

## Controls

Same as the other outdoor scenes. SPACE always jumps; ENTER inside any tent radius opens that tent's Colyseus room.

## Invariants

- Non-square image — width (2806) ≠ height (2242). Camera bounds + physics world must use the non-square rect, not a square approximation.
- `buildingId` strings MUST remain distinct — they are the Colyseus sharding key.
- No Colyseus in this scene itself.
