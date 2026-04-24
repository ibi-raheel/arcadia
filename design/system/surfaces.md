# Surfaces — six papers

Every card in Arcadia's UI is ONE of these six. Don't invent a seventh without updating this file + an ADR. Don't use a flat rectangle with no grain.

Source: section III of `reference/2026-04-23_v4.5-scriptorium-01-design-system.html` (classes `.scroll-card`, `.vellum-card`, `.ledger-card`, `.envelope-card`, `.journal-card`, `.map-card`).

---

## 1. `scroll-card` — the royal missive

**Feel:** rolled, both ends curled, dramatic.
**Background:** noisy SVG fractal overlay + radial gradient from `--scroll` → `--vellum` → `--vellum-2`, blended `multiply`.
**Signature move:** the top and bottom edges have curled ::before / ::after pseudo-elements (striped with `--vellum-shadow` / `--vellum-3`) that read as the rolled ends.
**Rotation:** ±1° typical.
**Use for:** announcements, royal-missive CTAs, hero cards on the hub, dramatic news.
**Don't use for:** dense lists, forms, long-form reading (the curl distracts).

## 2. `vellum-card` — flat leaf of vellum

**Feel:** flat, unrolled. The workhorse.
**Background:** noise overlay + `linear-gradient(180deg, --vellum → --vellum-2)`.
**Variant:** `.vellum-card.corded` adds a leather cord across the top (a `--leather` → `--leather-dark` horizontal bar with shadow) — "bound at the spine."
**Rotation:** ±0.8° typical.
**Use for:** lists, forms, tables of contents, settings panels, the type-sample cards, drop-cap paragraphs, everything boring-but-necessary.
**Don't use for:** the one piece of hero content on a page — use `scroll-card` or `map-card` for that.

## 3. `ledger-card` — the keeper's record

**Feel:** ruled horizontal lines bleeding through, double-stitched spine on the left, wax seal usually at top-right.
**Background:** repeating horizontal rules (rgba ink lines at 28px) + noise + `linear-gradient(--ledger → --parchment-2)`.
**Structural:** left border is `3px double var(--bronze-deep)`; a `.stitch` element at x=10 runs as a dashed bronze vertical.
**Rotation:** ±0.6° typical.
**Use for:** creator dashboard records (course rows, section rows, published lessons), order histories, anything ledgery.
**Pair with:** `.wax` seal at top-right for status (published, locked, signed).

## 4. `envelope-card` — the sealed letter

**Feel:** dark, leather-brown, heavy. Inverse of vellum.
**Background:** noise + `linear-gradient(135deg, --leather → --leather-dark)`. Color inside is `--vellum`.
**Rotation:** ±1.2° typical (a bit more — envelopes flop).
**Use for:** stats, heavy numbers, "locked" or gated content, dramatic totals, streak counters, analytics KPI cards.
**Pair with:** `.wax` seal at top-right for unsealing/status affordance.
**Don't use for:** long reading — the dark background fights with serif body.

## 5. `journal-card` — the scribe's graph-paper page

**Feel:** thin square grid bleeding through, ink-red left margin line.
**Background:** two repeating linear gradients (0° + 90°, both with rgba ink stripes at 26px) + noise + `linear-gradient(--parchment → --parchment-2)`.
**Structural:** left border `2px solid rgba(168, 54, 74, 0.6)` — the ink-red margin.
**Rotation:** ±0.4° typical.
**Use for:** charts, tallies, analytics plots, anything with numeric / spatial data that benefits from the grid. Creator analytics is the canonical use.
**Pair with:** JetBrains Mono labels, hand-drawn "ink line" SVG paths over the grid.

## 6. `map-card` — terra cognita

**Feel:** aged, weathered, darker than scrolls.
**Background:** heavier noise + radial from `--scroll` → `--vellum-2` → `--vellum-3`. Inset shadow makes it feel like parchment scorched at the edges.
**Rotation:** ±0.6° typical.
**Use for:** world maps, area trails, navigation, "locations visited" displays.
**Don't use as:** a generic content card — it carries cartographic meaning.

---

## Choosing a surface (quick rubric)

| The content is… | Use |
|-----------------|-----|
| Important news, hero moment | `scroll-card` |
| Generic list / form / text | `vellum-card` |
| A record with rows / status | `ledger-card` |
| A number / stat / gated thing | `envelope-card` |
| A chart / data plot | `journal-card` |
| A place / route / map | `map-card` |

## Layering rules

- Stack at most 2 surfaces on one desk. More than that and the desk becomes busy.
- Rotate each card in the opposite direction of its neighbor so they "read" as hand-placed, not as a grid.
- All surfaces sit on the `.desk` (stained oak) — never directly on `--night`. The desk is the frame.
- Shadows are deep (`0 18-24px ~34-46px rgba(0,0,0,0.52-0.62)`); the desk must earn them with its dark base.

## Shadow anatomy

Every surface carries this base shadow stack:
```
box-shadow:
  0 18px 36px rgba(0, 0, 0, 0.55),   /* cast shadow on desk */
  inset 0 0 60px rgba(140, 100, 40, 0.22);  /* warm inner glow from lantern */
```
Tune the values per primitive; keep the two-layer structure (cast shadow + warm inset).
