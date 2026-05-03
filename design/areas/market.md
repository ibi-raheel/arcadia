# Area: the market (Phaser interior + four-stall React overlay)

**Route:** `/market` (Phaser `MarketScene`) → walk to central crystal + ENTER → fullscreen `MarketOverlay` over the canvas
**Lexicon name:** the market; each category is a "stall" (Courses · Templates · Tools · Exclusives); a creator's offering inside a stall is a "good" (a course, template, tool, or sealed coffer)
**Reference:** not yet in `reference/`. Commit a starter mockup once the four-stall layout settles.

## Scope boundary

**This file governs the React `MarketOverlay` and the four-stall dashboard inside it (`Market` → `CategoryPicker` → `CategoryView`).** The Phaser interior (`apps/web/components/game/scenes/market/`) is game rendering — governed by its own per-scene CLAUDE.md. There is no per-stall click pattern in Phaser; the only interaction is the central crystal proximity prompt.

## Purpose

Where a member browses the realm's offerings. The market is no longer a single course catalogue — it's a four-stall hall:

- **Courses** — long-form lessons (real DB rows, free for the demo).
- **Templates** — pattern sheets, swipe files, design files, Notion docs (simulated fixtures, mix of free + paid).
- **Tools** — software, scripts, browser extensions, CLIs (simulated fixtures, mix of free + paid).
- **Exclusives** — sealed bundles ("coffers") containing a mix of the above (simulated fixtures, mix of free + paid).

The first thing a member sees is the four-stall picker (`CategoryPicker`); clicking a card opens that stall's catalogue inside the same overlay (`CategoryView`).

## Mood (starter)

Daytime-ish compared to the academy (which is late evening). Still on the same desk, still lantern-lit, but the envelope and map primitives come out — because a stall is about place, goods, and a ledger of what's sold.

The overlay arrives over the Phaser scene (no slide, no fade — it's a full-canvas dashboard, not a popover). The Phaser canvas behind keeps existing; closing returns the player to the same spot.

## Signature surfaces

- **CategoryPicker landing** — four large doorway cards (Courses / Templates / Tools / Exclusives), echoing the realm-hub doorways on `/`. Each card carries its own `WaxSeal`-style sigil (C / T / W / E) in a category-specific accent (verdigris / wax / bronze / gilt) and shows the item count + a one-line tagline.
- **CategoryView shell** — `NightRoom + Desk` background. Header with a `DropCap`, the category name in italic display, the item count in `Hand`, and a `← back to the market` ghost button.
- **Two-column layout** — left rail = scrollable item list (each row: title, creator name in small-caps mono, price chip / `$X`); right pane = preview + checkout. Selecting a row swaps the preview pane.
- **Preview pane** — a `MapCard` with the item's title, creator, kicker, description, and a preview block. Three preview kinds:
  - `text` — short scriptorium pre-block (mono).
  - `list` — bulleted list (for checklists + bundle contents).
  - `mock-screenshot` — italic caption describing a hypothetical screenshot (no real image assets needed for the sim).
- **Checkout footer** — `PriceTag` on the left (chip for free / `$X` mono label for paid / `owned` chip post-purchase) + the action button on the right. Verb varies by category meta: free → "claim the template", "claim the tool", "unbind the coffer", etc. Paid → "pay & download · $X" or similar. Owned → "step inside →" (Courses), "download →" (Templates / Tools), "open the coffer →" (Exclusives).
- **Overlay actions cluster** — top-right of the viewport, z-index 90: ✕ close (returns to scene), ← return to the world (full nav to /world), and a real signout form (logout, `target="_top"`).

## Components likely needed

- `MarketOverlay` wrapper — fullscreen modal with the dashboard inside + the actions cluster.
- `Market` orchestrator — owns the active-category state + in-memory ownership set.
- `CategoryPicker` — 4-card landing.
- `CategoryView` — list rail + preview pane + checkout footer.
- `PriceTag` — chip / `$X` / `owned` variants.
- `WaxSeal` letter variant — already in scriptorium kit; reused for category sigils.
- `Chip` — for "free", "owned", and bundle-contents pills.

## Copy voice

- Picker landing kicker: "the market is open".
- Picker landing tagline (per stall): "long-form lessons by lamplight" (Courses), "templates, swipe files, blueprints" (Templates), "software, scripts, plugins" (Tools), "sealed bundles · members-only" (Exclusives).
- Item title: italic display.
- Creator name: `by <name>` in small-caps mono.
- Empty stall: "this stall is being set out. come back by lamplight." — NOT "No items yet".
- Action verbs: scriptorium-flavoured per category (see CategoryMeta). Avoid "Buy now", "Add to cart".
- Pay confirmation: the "stamping…" label during the simulated 700 ms delay flips to "✓ owned" via the chip — no toast.

## Open questions

- Real preview imagery for Templates / Tools — currently `mock-screenshot` is a caption. When the first real asset ships, swap the preview kind to `image`.
- Coffer (Exclusives) "what's inside" pills — currently a flat `Chip` row. Should they hover-link back to the underlying items in their own stalls? Worth designing once item count grows.
- The `← back to the market` button vs. ✕ close — back returns to the picker; close dismisses the whole overlay. Both are useful; the visual hierarchy could be sharper.
- Real payment integration — out of scope; current "purchase" is in-memory. When this lands, the checkout footer will need a payment form rather than a one-click button.

## Code pointers

- `apps/web/components/game/scenes/market/` — Phaser interior (NOT this file's scope).
- `apps/web/components/game/GameMarket.tsx` — Phaser mount + MarketOverlay toggle on `MARKET_OPEN_CATALOG_EVENT`.
- `apps/web/app/market/_components/MarketOverlay.tsx` — fullscreen modal + actions cluster.
- `apps/web/app/market/_components/Market.tsx` — top-level dashboard orchestrator.
- `apps/web/app/market/_components/CategoryPicker.tsx` — 4-card landing.
- `apps/web/app/market/_components/CategoryView.tsx` — list + preview + checkout for one stall.
- `apps/web/lib/market/types.ts` — `MarketCategoryId`, `MarketItem`, `CATEGORY_META`, `CATEGORY_ORDER`.
- `apps/web/lib/market/fixtures.ts` — Templates / Tools / Exclusives fixtures.
- `apps/web/app/market/_components/{CatalogScroll,StallView}.tsx` — preserved on disk for reference (the pre-2026-05-02 per-course modal flow), no longer imported.

## Review log

- **2026-05-02** — Phase-15-ish rework. Replaced the per-course `CatalogScroll` + URL-driven `StallView` modal pair with a four-stall dashboard (`MarketOverlay` / `Market` / `CategoryPicker` / `CategoryView`) opened from the crystal proximity prompt. Pricing changed from "X coin" to `$X`. Categories: Courses · Templates · Tools · Exclusives. See `docs/changelog/2026-05-02_market-overlay-and-polish.md`.
