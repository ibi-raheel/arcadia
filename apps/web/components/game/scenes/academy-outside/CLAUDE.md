# AcademyOutsideScene

> *Demo NPCs (PR #62 · 2026-05-06): when simulation mode is on, `NpcSwarm` (`../shared/npc-swarm.ts`) spawns **5 wandering NPCs** outside the academy gate at the player's `walkSpeed`. Wired via the `OutdoorSceneBase` parent — same swarm in the other two outdoor scenes. Sim off (default) = no NPCs.*

Single-player outdoor area north of the square. Image-backed. One ENTER-prompt gate trigger at the main entrance → `/academy`. One walk-onto return edge at the bottom → `/world`.

## Files

- `AcademyOutsideScene.ts` — thin subclass of `OutdoorSceneBase` (in `scenes/shared/`). Only declares the scene key + `sceneConfig` assembled from the sibling config modules.
- `camera.config.ts` — bounds match `public/worlds/academy-2508x2508.png` (2508×2508). Zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(1254, 2300)` — 208px inside the bottom edge so the member is clearly inside the scene on arrival.
- `layers.config.ts` — empty colliders; one entry trigger (`academy-main` at `(1254, 2130)`, 160px radius); return edge on the bottom.
- `__tests__/configs.test.ts` — shape + route assertions per ADR 0004.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Space** — one-shot jump (always, regardless of prompt visibility).
- **Enter** — when the "Press ENTER to visit Academy" prompt is visible (within the gate trigger's radius), fades the camera and navigates to `/academy`. Otherwise a no-op.
- Walking within 56px of the bottom edge — fade + back to `/world`.

## Invariants

- No Colyseus — single-player.
- SPACE and ENTER are bound independently in the base class — SPACE always triggers jump, ENTER fires the prompt only when a trigger is active.
- Entry coordinates are eyeballed from the source 1× preview; adjust `entryTriggers[0].centerX/Y` in `layers.config.ts` if they need nudging.
