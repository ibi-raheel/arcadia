# MarketScene

The realm's market hall. Member walks a 1536×1024 interior and steps up to a central **crystal** — pressing ENTER opens the **four-stall market dashboard** (`MarketOverlay`, hosting `<Market>`) in a fullscreen React overlay over the Phaser canvas. Stalls are: Courses · Templates · Tools · Exclusives. Single-player; no Colyseus.

The dashboard is React-on-the-same-page (not an iframe) — keeps the Phaser canvas + ambient music alive while open. Closing returns the player to the scene exactly where they were.

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
- Supabase: courses + enrolment state fetched server-side by `app/market/page.tsx`. Real `courses` rows are shaped into `MarketItem` and passed to `GameMarket` → `MarketOverlay` → `Market`. Templates / Tools / Exclusives are hand-authored fixtures (`@/lib/market/fixtures`) — the "purchase" for those is simulated (700 ms delay + local-state flip). Courses still go through the real `enrolInCourse` server action. `MARKET_STALLS_REGISTRY_KEY` is no longer set; the registry constant is exported but unused (kept for backwards compat with anything that may reference it).

## React ↔ scene events (on `game.events`)

- `MARKET_OPEN_CATALOG_EVENT` — fired when the member is inside the crystal radius and presses ENTER. `GameMarket` listens and toggles `MarketOverlay`'s `open` prop. No payload.

## React overlays

- `MarketOverlay` (`app/market/_components/MarketOverlay.tsx`) — fullscreen four-stall dashboard. Header carries ✕ close, ← return to world, and a real signout form (`target="_top"` so the parent navigates cleanly post-logout). The dashboard inside is `<Market>` (CategoryPicker → CategoryView with list rail + preview pane + simulated checkout footer). Esc dismisses.
- `CatalogScroll` + `StallView` — preserved on disk for reference but no longer imported (replaced 2026-05-02). The per-course `?course=<id>` URL pattern is gone with them.

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
