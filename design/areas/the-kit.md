# Area: the kit (design system showcase)

**Route:** `/kit`
**Lexicon name:** the kit — "the design system" is never said aloud
**Reference:** `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`

## Purpose

The canonical tour of the midnight scriptorium. One long desk, seven folios, everything the room is built from. It is a mood piece as much as a reference — a visitor should feel the room before they read a single token.

## Mood (committed 2026-04-23)

Late evening, the lantern is low, the desk is full. The scriptorium is not being explained — it is being laid out. Every element of the kit sits hand-placed on the oak. The viewer walks the length of the desk from colours → lettering → surfaces → hardware → illumination → motions → medallions.

No "docs-site" feel. No tabs, no sidebar, no sticky TOC. Scroll is the only navigation — because this is a folio, not an application.

## Signature surfaces

- **Section dividers** — `ScribeDivider` with roman-numeral chap label + ornament + optional Caveat note. Gilt small-caps.
- **Section I (Colours)** — 4×2 swatch grid. Each swatch is a dark tile holding a color block + display-italic name + Mono hex + Caveat description. Swatches rotate `-1.2° / +1° / -0.4°` cycled via `:nth-child(3n)`.
- **Section II (Lettering)** — type-sample rows on a dark ground. One row per family: display / caps / body / hand / mono. Each row shows a big, a mid, and a tiny.
- **Section III (Surfaces)** — the six primitives shown as real cards with kicker + title + body + marginalia.
- **Section IV (Hardware)** — a gallery row of wax seals, bronze studs at assorted sizes, iron nails, a leather cord strip, inkwell + quill SVG composition.
- **Section V (Illumination)** — three drop caps side by side on their own mini-vellum surfaces (blue / wax / verdigris grounds).
- **Section VI (Motions)** — one row of buttons (primary / wax / ghost), a chip trio, and a pair of fields with labels.
- **Section VII (Medallions)** — a 6-wide grid: three cast bronze, two aged verdigris, one unearned.

## Components used

Every `components/kit/*` primitive. This page is both a showcase and a smoke test.

## Copy voice

- Page head: italic display — "a room by lamplight, built by hand." Byline: `~ every swatch, every seal, every scrawl ~`.
- Chap labels: Roman numerals — `· I · COLOURS`, `· II · LETTERING`, `· III · SURFACES`, `· IV · HARDWARE`, `· V · ILLUMINATION`, `· VI · MOTIONS`, `· VII · MEDALLIONS`.
- Divider notes (Caveat, gilt): `~ four hands, each with a purpose ~`, `~ every page has a grain ~`, `~ fixings, seals, and the quiet ironmongery ~`, `~ a gilded letter, for a beginning ~`, `~ the things that move ~`, `~ cast in bronze · earned, aged, locked ~`.
- Endnote: *"a room is only as warm as its lantern and as quiet as its ink."* — inscribed in the margin, folio xxvii.

## Review log

- **2026-04-23** — first implementation shipped as a design-only static page (Phase B of the frontend build-out per the design workspace). No auth gating, no dynamic data. The kit is deliberately read-only; if we ever add interactivity it must serve pedagogy (copy-to-clipboard on tokens, hover-reveal CSS), not navigation.
- **2026-04-23** — motion pass: the kit now doubles as a showcase for the arrival sequence. `.grid-12 .stagger` reveals every section with 0.1s cadence. The medallion grid in Section VII drops cell-by-cell and breathes/gleams per the ornaments spec. Wax seals (on the ledger + envelope examples in Section III) stamp down. Every paper primitive carries the ambient `page-breathe` loop. The cursor lantern pool follows the reader as they scroll through the folio — which turns the kit from "a docs page" into "a warm desk you read at." See `system/motion.md` for the full roster.
