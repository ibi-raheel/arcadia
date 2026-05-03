# Market — in-world overlay + Templates rename + USD pricing + wider layout

**Date:** 2026-05-02
**PRs:** #59 (initial four-stall market) → #60 (overlay rework + polish)
**Supersedes:** the React-only `/market` page that briefly shipped in #59. The Phaser MarketScene is back as the route; the dashboard is now an in-world overlay.

The four-stall market dashboard (Courses / Templates / Tools / Exclusives) shipped in PR #59 as a pure React page at `/market` — the Phaser `MarketScene` was preserved on disk but not rendered. PR #60 reworks that decision: `/market` is the Phaser scene again, and the dashboard opens as a fullscreen React overlay when the player walks up to the central crystal and presses ENTER.

## What changed

### Market dashboard becomes an in-world overlay (PR #60)

- `/market` routes back to the Phaser `MarketScene` (image-backed interior + central crystal). Same scene as before — no scene-side changes.
- Walking up to the crystal + ENTER fires `MARKET_OPEN_CATALOG_EVENT` (already existed). `GameMarket.tsx` now toggles a new `MarketOverlay` instead of the legacy `CatalogScroll`/`StallView` pair.
- `MarketOverlay` is React-on-the-same-page (NOT iframe). Choosing same-page means the Phaser canvas + ambient music + any Colyseus state stay alive while the dashboard is open. Closing returns the player to the scene exactly where they were.
- Header at top-right (z-index 90 — above the overlay backdrop): ✕ close, ← return to the world, logout (real signout form with `target="_top"`). Esc dismisses too.
- The legacy `CatalogScroll` + URL-driven `StallView` (`?course=<id>`) are preserved on disk under `app/market/_components/` for reference but no longer imported.

### Patterns → Templates (PR #60)

Renamed everywhere — the type id (`'patterns'` → `'templates'`), the fixtures key, every fixture's `category` field, the fixture id prefix (`pattern-` → `template-`), the kicker text, the picker copy, the comments. Tools' seal letter shifted T → W to avoid clashing with Templates' new T.

### "$X" pricing instead of "X coin" (PR #60)

`PriceTag` and the paid-action button label both updated. Visual currency only — still no payment integration. The simulated 700 ms "stamping…" purchase flow is unchanged; only the display string changed.

### Layout breathes wider (PR #60)

`CategoryPicker` maxWidth 1080 → 1280 (the 4-card grid now uses the extra space). `CategoryView` maxWidth 1180 → 1480; list rail `minmax(280, 360)` → `minmax(320, 420)`. Items in the rail and the preview pane both get meaningful extra room on wide viewports — fixes the cramped wrapping the user flagged from a 19:23 screenshot.

### Logout from /market (PR #60)

The overlay header carries a real signout form (`target="_top"` so it escapes any future iframe context cleanly). Closes the gap where members had no logout path from /market.

## What's preserved

- `MarketScene.ts` (the Phaser scene) — unchanged.
- `app/market/_components/CatalogScroll.tsx` — unused but kept on disk.
- `app/market/_components/StallView.tsx` — unused but kept on disk.
- `MARKET_STALLS_REGISTRY_KEY` constant — exported from `MarketScene.ts` but no longer set or read; kept for backwards compat in case anything still imports it.

## Files

**Added:**

- `apps/web/lib/market/types.ts` — `MarketCategoryId`, `MarketItem`, `MarketPrice`, `MarketPreview`, `CATEGORY_META`, `CATEGORY_ORDER`. (Originally PR #59; key/copy edits in #60.)
- `apps/web/lib/market/fixtures.ts` — hand-authored Templates / Tools / Exclusives entries. (Originally PR #59; key/copy edits in #60.)
- `apps/web/app/market/_components/Market.tsx` — top-level client orchestrator + ownership state.
- `apps/web/app/market/_components/CategoryPicker.tsx` — 4-card landing.
- `apps/web/app/market/_components/CategoryView.tsx` — list rail + preview pane + checkout footer.
- `apps/web/app/market/_components/MarketOverlay.tsx` — fullscreen modal wrapping `<Market>` + the header buttons (added in #60).

**Changed:**

- `apps/web/app/market/page.tsx` — server component, fetches courses + memberships, shapes courses into `MarketItem[]`. In #59 it rendered `<Market>` directly; in #60 it renders `<GameMarket>` again (Phaser scene + overlay).
- `apps/web/components/game/GameMarket.tsx` — dropped `CatalogScroll` + `StallView` + `?course=<id>` URL handling; wires `MARKET_OPEN_CATALOG_EVENT` to `MarketOverlay`'s open state. Props slimmed: just `member` + `courses`.
- `apps/web/components/game/scenes/market/CLAUDE.md` — overlay-rework notes + reference to the legacy components on disk.

## Tests + verification

Local CI (per [CLAUDE.md sub-phase ritual](../../CLAUDE.md)):

- `npm run format:check` — clean.
- `npm run lint` — clean (`--max-warnings=0`).
- `npm run typecheck` — clean.
- `npx vitest run` — 254 passing, 23 skipped.
- `next build` — production compile green; `/market` route 11.4 kB / 515 kB First Load (Phaser bundle is back, expected).

Visual checklist:

- Sign in. Walk south from `/world` — lands on Phaser `MarketScene`, NOT the React dashboard.
- Walk to the central crystal + ENTER → dashboard overlay opens; picker shows 4 cards (Courses · Templates · Tools · Exclusives).
- Click each stall — list rail wider; titles + prices fit comfortably; preview pane spans the rest of the viewport.
- Pricing renders as `$8` / `$24` etc.
- Paid button reads `pay & download · $24`.
- ✕ close OR Esc dismisses; player back in the scene at the same spot.
- ← return to the world navigates to `/world`.
- logout cleanly signs out and lands on `/`.
