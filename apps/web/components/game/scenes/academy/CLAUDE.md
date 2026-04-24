# AcademyScene

Interior room (Phase 3.5). Mirror of TavernScene's image-backed shape, minus the multiplayer and chat machinery. Member walks around a 1536×1024 interior and steps up to a central **lectern** — pressing ENTER opens a React scroll modal (`LedgerScroll`) listing the courses in their library; each row in the scroll links to `/academy/[courseId]`.

## Files

- `AcademyScene.ts` — scene class. Loads the interior image, mounts `LocalAvatar`, renders the central lectern + gilt halo + "Press ENTER to open the Scribe's Ledger" proximity prompt.
- `camera.config.ts` — zoom `1.365×` (matches new Tavern), rect-shaped bounds = `ACADEMY_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar `135×135`. `lectern` block: `centerX`, `centerY`, `pedestalWidth`, `interactRadius`.
- `layers.config.ts` — depth bands (ground / podiums / dynamic / overlay), plus `ACADEMY_EXIT_ARCHWAY` — ENTER-gated proximity trigger at `(768, 960)` radius `120`. Route returns to `/academy-outside`; academy-outside's bottom-edge return then carries `?from=academy` to the Square, landing the member at the north gate (2026-04-23 Phase 7 AC10). The `podiums` depth band is reused for the lectern visuals.
- `__tests__/configs.test.ts` — shape assertions.

## Assets loaded

- `public/academy-interior.png` — 1536×1024 user-supplied image. Declared via `BOOT_ASSETS.academyInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- **No Colyseus.** Single-player Phase 3.5; if we want peers in the hall later, drop in an `academy-realm1` room (same shape as `tavern-realm1`).
- Supabase: courses + progress fetched server-side by `app/academy/page.tsx`; passed to the scene via `ACADEMY_COURSES_REGISTRY_KEY` before Phaser boots, and forwarded to `LedgerScroll` in React.

## React ↔ scene events (on `game.events`)

- `ACADEMY_OPEN_LEDGER_EVENT` — fired when the member is inside the lectern radius and presses ENTER. `GameAcademy` listens and opens the `LedgerScroll` modal. No payload — the React mount already holds the course list.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **ENTER at the lectern** — opens the Scribe's Ledger scroll (list of courses; click a row to step into one).
- **SPACE** — one-shot jump (2026-04-23 Phase 7 AC8 — `createJumpBinding`).
- **ENTER near the bottom-centre archway** — shows `Press ENTER to leave the Academy` and routes to `/academy-outside` (2026-04-23 Phase 7 AC10).

## Invariants

- Image origin is (0, 0) top-left; bounds match image size.
- `LocalAvatarOptions.spawnPixel` required (same as TavernScene — no iso projection).
- `BOOT_ASSETS.academyInterior` must be preloaded by BootScene before scene start.
- ADR 0004: no hardcoded tweakable values in `AcademyScene.ts`; all live in the sibling `*.config.ts` modules.
- TAD §4.2 originally said "Academy never gets a Phaser scene" — superseded by this scene (2026-04-20 inline amendment; revisit whether to promote to a dedicated ADR before Phase 5).
- ENTER consumption order: lectern prompt runs first, archway prompt second. A single ENTER press fires at most one of the two so the member can never trigger both simultaneously when the two radii happen to overlap.

## History

- **2026-04-24** — replaced the floating-card "podium" pattern with a single centrepiece lectern + React scroll modal. `renderPodiums()` gone; `renderLectern()` draws pedestal + book + halo + caption. `ACADEMY_NAVIGATE_EVENT` retired (course-click navigation now happens inside React via `Link`).
