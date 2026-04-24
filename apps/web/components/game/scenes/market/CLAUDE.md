# MarketScene

Phase 4 course catalogue. Member walks a 1536×1024 interior and clicks a **stall** (one per published course) to open the React `StallView` modal over a blurred Phaser canvas. Single-player; no Colyseus.

## Files

- `MarketScene.ts` — scene class. Loads interior image, mounts `LocalAvatar`, renders one clickable stall per course passed via registry.
- `camera.config.ts` — zoom `1.0` (lives under `applyFillZoom` — see `scenes/shared/fill-zoom.ts`), rect-shaped bounds = `MARKET_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar spawn at `(768, 140)` under the top archway (2026-04-23 Phase 7 M1), size `135×135`. Stall geometry: size, spacing, row layout.
- `layers.config.ts` — depth bands (ground / stalls / dynamic / overlay), plus `MARKET_RETURN_EDGE` on the top edge with `promptLabel: 'Press ENTER to return to the Square'` and `span: { min: 500, max: 1036 }` confining firing to the archway width. Route is `/world?from=market` so the Square spawns the member on the south bridge.
- `__tests__/configs.test.ts` — shape assertions.

## Assets loaded

- `public/market-interior.png` — 1536×1024 user-supplied image. Declared via `BOOT_ASSETS.marketInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- **No Colyseus.** Single-player Phase 4. Multiplayer would mirror `tavern-realm1`; punt to Phase 5 if wanted.
- Supabase: courses + enrolment state fetched server-side by `app/market/page.tsx`; passed to the scene via `MARKET_STALLS_REGISTRY_KEY`.

## React ↔ scene events (on `game.events`)

- `MARKET_OPEN_STALL_EVENT` — fired on stall click with the course id. `GameMarket` listens and opens the `StallView` modal, updating URL `?course=<id>`.
- `MARKET_FILTER_EVENT` — was wired to a HUD search input. The input + emission were removed 2026-04-23 (Phase 7 M5); the scene's listener is now dormant. Remove in a future cleanup if not re-introduced.

## React overlays (2026-04-23 Phase 7 pass)

- `← Return to World` button — removed. The top-archway ENTER exit covers it.
- `Search stalls…` input — removed; search state + `MARKET_FILTER_EVENT` emit effect deleted from `GameMarket.tsx`.
- `StallView` enrolment persists across modal reopens in the same session. `GameMarket` owns a `locallyEnrolledIds` Set passed back via `onEnrolled(courseId)` and merged into `activeStall.enrolled` so reopening a stall after enrolling still shows "Open in Academy" instead of Enrol.

## Stall visuals

Each stall is one `Rectangle` + three `Text` objects (title, "by <creator>", lesson/enrolment count). Enrolled courses are drawn with an emerald stroke + dark-green fill; unenrolled use purple. Clicking the rect fires `MARKET_OPEN_STALL_EVENT`.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **Click a stall** — open its modal.
- **HUD search** — type to filter.

## Invariants

- Image origin is (0, 0) top-left; bounds match image size.
- Stall rects store `courseId` via `setData('courseId', id)` — React can also grab them by id.
- ADR 0004: no hardcoded tweakable values in `MarketScene.ts`; all in sibling `*.config.ts`.
- TAD §4.2 "Market stays React-only" superseded by this scene (2026-04-21 inline amendment).
