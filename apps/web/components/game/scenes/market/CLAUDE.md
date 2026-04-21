# MarketScene

Phase 4 course catalogue. Member walks a 1536×1024 interior and clicks a **stall** (one per published course) to open the React `StallView` modal over a blurred Phaser canvas. Single-player; no Colyseus.

## Files

- `MarketScene.ts` — scene class. Loads interior image, mounts `LocalAvatar`, renders one clickable stall per course passed via registry.
- `camera.config.ts` — zoom `1.365×` (matches Tavern + Academy), rect-shaped bounds = `MARKET_INTERIOR_SIZE` (1536×1024).
- `sprites.config.ts` — avatar `90×90` (mirrors Tavern + Academy). Stall geometry: size, spacing, row layout.
- `layers.config.ts` — depth bands (ground / stalls / dynamic / overlay).
- `__tests__/configs.test.ts` — shape assertions.

## Assets loaded

- `public/market-interior.png` — 1536×1024 user-supplied image. Declared via `BOOT_ASSETS.marketInterior`.
- Reuses every avatar spritesheet preloaded by BootScene.

## Synced with

- **No Colyseus.** Single-player Phase 4. Multiplayer would mirror `tavern-realm1`; punt to Phase 5 if wanted.
- Supabase: courses + enrolment state fetched server-side by `app/market/page.tsx`; passed to the scene via `MARKET_STALLS_REGISTRY_KEY`.

## React ↔ scene events (on `game.events`)

- `MARKET_OPEN_STALL_EVENT` — fired on stall click with the course id. `GameMarket` listens and opens the `StallView` modal, updating URL `?course=<id>`.
- `MARKET_FILTER_EVENT` — React HUD → scene. Payload: lowercased search string. Scene hides stalls whose `haystack` (title + creator name) doesn't match.

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
