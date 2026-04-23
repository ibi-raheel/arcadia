# AcademyOutsideScene

Single-player outdoor area north of the square. Image-backed. One SPACE-prompt gate trigger at the main entrance → `/academy`. One walk-onto return edge at the bottom → `/world`.

## Files

- `AcademyOutsideScene.ts` — thin subclass of `OutdoorSceneBase` (in `scenes/shared/`). Only declares the scene key + `sceneConfig` assembled from the sibling config modules.
- `camera.config.ts` — bounds match `public/worlds/academy-2508x2508.png` (2508×2508). Zoom 1.0.
- `sprites.config.ts` — avatar spawn at `(1254, 2300)` — 208px inside the bottom edge so the member is clearly inside the scene on arrival.
- `layers.config.ts` — empty colliders; one entry trigger (`academy-main` at `(1254, 2130)`, 160px radius); return edge on the bottom.
- `__tests__/configs.test.ts` — shape + route assertions per ADR 0004.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Space** — one-shot jump *unless* the "Press SPACE to Enter Academy" prompt is visible (within the gate trigger's radius), in which case SPACE fades the camera and navigates to `/academy`.
- Walking within 56px of the bottom edge — fade + back to `/world`.

## Invariants

- No Colyseus — single-player.
- SPACE is coordinated between jump and enter-prompt by the base class: prompt wins when active.
- Entry coordinates are eyeballed from the source 1× preview; adjust `entryTriggers[0].centerX/Y` in `layers.config.ts` if they need nudging.
