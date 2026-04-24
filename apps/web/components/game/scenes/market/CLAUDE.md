# MarketScene

Phase 4 course catalogue. Member walks a 1536×1024 interior and steps up to a central **crystal** — pressing ENTER opens a React catalog scroll (`CatalogScroll`) that lists every published stall in the realm. Clicking a stall row drops `?course=<id>` into the URL, which opens the existing `StallView` modal over a blurred Phaser canvas. Single-player; no Colyseus.

## Files

- `MarketScene.ts` — scene class. Loads interior image, mounts `LocalAvatar`, renders the central crystal + pedestal + glow + proximity prompt.
- `camera.config.ts` — zoom `1.0×` (under `applyFillZoom`), rect-shaped bounds = `MARKET_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar spawn at `(768, 140)` under the top archway, size `135×135`. `crystal` block: `centerX`, `centerY`, `pedestalWidth`, `interactRadius`.
- `layers.config.ts` — depth bands (ground / stalls / dynamic / overlay), plus `MARKET_RETURN_EDGE` on the top edge with `promptLabel: 'Press ENTER to return to the Square'` and `span: { min: 500, max: 1036 }` confining firing to the archway width. Route is `/world?from=market`. The `stalls` depth band is reused for the crystal visuals.
- `__tests__/configs.test.ts` — shape assertions.

## Assets loaded

- `public/market-interior.png` — 1536×1024 user-supplied image. Declared via `BOOT_ASSETS.marketInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- **No Colyseus.** Single-player. Multiplayer would mirror `tavern-realm1`; punt to Phase 5 if wanted.
- Supabase: courses + enrolment state fetched server-side by `app/market/page.tsx`; passed to the scene via `MARKET_STALLS_REGISTRY_KEY` and forwarded to `CatalogScroll` in React.

## React ↔ scene events (on `game.events`)

- `MARKET_OPEN_CATALOG_EVENT` — fired when the member is inside the crystal radius and presses ENTER. `GameMarket` listens and opens the `CatalogScroll` modal. No payload.

## React overlays

- `CatalogScroll` — full-screen scriptorium `MapCard` dialog listing every stall (title, creator, lesson count, enrolment count, enrolled-chip). Row click → `router.replace('/market?course=<id>')`.
- `StallView` — existing full-course modal. Open/close is URL-driven (`?course=<id>`) exactly as before; `locallyEnrolledIds` keeps "Open in Academy" after a session enrol (Phase 7 item M6).
- `← Return to World` button — removed 2026-04-23 (the top-archway ENTER exit covers it).
- `Search stalls…` input — removed 2026-04-23; the catalog scroll is the browse affordance now.

## Controls

- **W / A / S / D** or arrows — move.
- **Click on floor** — click-to-move.
- **ENTER at the crystal** — opens the Catalog scroll (click a row to open that stall).
- **ENTER at the top archway** — returns to the Square.

## Invariants

- Image origin is (0, 0) top-left; bounds match image size.
- ADR 0004: no hardcoded tweakable values in `MarketScene.ts`; all in sibling `*.config.ts`.
- TAD §4.2 "Market stays React-only" superseded by this scene (2026-04-21 inline amendment).
- ENTER consumption order: crystal prompt runs first, top-edge return second. A single ENTER press fires at most one so a member standing inside both radii (spatially impossible today, but belt-and-braces) can't be double-handled.

## History

- **2026-04-24** — replaced the floating stall-card pattern with a single centrepiece crystal + React catalog scroll. `renderStalls()` and the `StallVisuals` / `applyFilter` / `MARKET_FILTER_EVENT` machinery are all gone. Stall picking now happens inside React (`CatalogScroll` → `pickStall` → `router.replace`).
