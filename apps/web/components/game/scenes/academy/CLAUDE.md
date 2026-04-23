# AcademyScene

Interior room (Phase 3.5). Mirror of TavernScene's image-backed shape, minus the multiplayer and chat machinery. Member walks around a 1536×1024 interior and clicks a **course podium** to open the React course viewer at `/academy/[courseId]`.

## Files

- `AcademyScene.ts` — scene class. Loads the interior image, mounts `LocalAvatar`, renders one clickable podium per course passed via registry.
- `camera.config.ts` — zoom `1.365×` (matches new Tavern), rect-shaped bounds = `ACADEMY_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar `135×135` (consistent with every other image-backed interior; bumped from 90×90 on 2026-04-22). Podium geometry: size, spacing, row layout params.
- `layers.config.ts` — depth bands (ground / podiums / dynamic / overlay).
- `__tests__/configs.test.ts` — shape assertions.

## Assets loaded

- `public/academy-interior.png` — 1536×1024 user-supplied image. Declared via `BOOT_ASSETS.academyInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- **No Colyseus.** Single-player Phase 3.5; if we want peers in the hall later, drop in an `academy-realm1` room (same shape as `tavern-realm1`).
- Supabase: courses + progress fetched server-side by `app/academy/page.tsx`; passed to the scene via `ACADEMY_COURSES_REGISTRY_KEY` before Phaser boots.

## React ↔ scene events (on `game.events`)

- `ACADEMY_NAVIGATE_EVENT` — fired on podium click with the course id. `GameAcademy` listens and calls `router.push('/academy/<id>')`.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Click on a podium** — opens that course's viewer.

## Invariants

- Image origin is (0, 0) top-left; bounds match image size.
- `LocalAvatarOptions.spawnPixel` required (same as TavernScene — no iso projection).
- `BOOT_ASSETS.academyInterior` must be preloaded by BootScene before scene start.
- ADR 0004: no hardcoded tweakable values in `AcademyScene.ts`; all live in the sibling `*.config.ts` modules.
- TAD §4.2 originally said "Academy never gets a Phaser scene" — superseded by this scene (2026-04-20 inline amendment; revisit whether to promote to a dedicated ADR before Phase 5).
