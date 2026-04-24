# Typography

Six hands, each with a purpose. Serifs everywhere except the mono chrome.

Source: section II of `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`.

## The six families

### Display — IM Fell English (italic)
`--font-display`. A scribe's hand, late-medieval. Always italic for display use; occasionally upright inside bronze-circle brand marks.

**Use for:** page titles, quest names, card titles (`h4` inside surface cards), button labels, wax-seal letters, drop-cap letterforms, field inputs (yes — fields use italic display for user input).

**Sizes in use:**
- `brand-text h1`: 32px
- `scriptorium-head h2`: 58px (42px on mobile)
- Surface card title (`h4`): 28px
- Button: 18px
- Type-sample "big": 38px
- Drop cap: 72px standard / 56px small
- Section-title `h3`: 38px

**Do:** italic. Letter-spacing usually at or slightly below 0 (`-0.5px` on the big h2).
**Don't:** use at small sizes for long reading — switch to body.

### Small caps — IM Fell English SC
`--font-caps`. Monastic, ceremonial, quiet.

**Use for:** chapter headers (scribe-divider `.chap`), nav labels, ledger heads, section kickers when you want stone-carved weight.

**Sizes:** 13px (chap), 10px–11px (tiny metadata).
**Letter-spacing:** 2.5–3px, uppercase.
**Color:** usually `--gilt` on dark, `--ink-faint` on vellum.

### Body — EB Garamond
`--font-body`. The reading hand. Default at 17px, line-height 1.55.

**Use for:** paragraphs, descriptions, card body copy, prose in modals.
**Italic variant:** reserved for emphasis, mid-size callouts, and any "voice of the scribe" copy.

### Script — Cormorant Garamond
`--font-script`. Loaded but rarely primary. Use as a backup display when IM Fell feels too dense (very small italic display sizes, or long pull-quotes). Don't mix it visibly next to `--font-display` — they fight.

### Hand — Caveat
`--font-hand`. Marginalia. Warm, hand-scribbled, off-axis.

**Use for:** bylines, sticky-note prompts, "~ swatch descriptions ~", byline scrawls next to section headers, field labels, empty-state prompts.
**Always:** tilt by a small amount (`rotate(-1deg)` to `rotate(-2deg)`).
**Color:** `--oxblood` or `--gilt` on dark, `--ink-soft` on vellum.
**Don't:** use for buttons, numeric data, or any copy that must be machine-parseable.

### Mono — JetBrains Mono
`--font-mono`. Tiny, all-caps, wide letter-spacing.

**Use for:** kickers above titles (`· THE DESIGN KIT · MIDNIGHT SCRIPTORIUM`), timestamps (`09·41 PM · LANTERN LIT · 31 PRESENT`), folio tags (`FOL · XVII`), micro-captions, hex codes in `.hex` swatches.
**Sizes:** 10–12px.
**Letter-spacing:** 1.5–2.5px. Always uppercase.
**Color:** `--ink-faint` or `--ink-quiet` on vellum; `--gilt` on dark.

## Pairings

- **Display (h2) + Hand (byline tilted -1°)** — signature hero pattern. See `scriptorium-head`.
- **Display (h4 card title) + Body (italic card blurb) + Hand (oxblood aside)** — standard surface card.
- **Mono kicker + Display h3 + Hand note** — the `ds-section-title` pattern.
- **Small caps chap + dashed bronze line + ornament ✦** — the `scribe-divider` pattern between sections.

## Drop caps (illumination)

Three-line gilt letter on a colored ground:

- **Blue ground** (`--ink-blue` radial) — the default. Gilt letterform with ink-red corner dots.
- **Wax ground** (`--wax` radial) — for chapter openings; gilt letter glows deeper.
- **Verdigris ground** — for reflective / late-night text. Quieter than lapis.

Specs (from `.dropcap` class):
- 96×96 standard / 76×76 inline
- 72px letter (56px inline)
- Gilt letter on radial colored ground with `0 0 0 2px var(--gilt-deep)` + `0 0 0 3px var(--night)` double-ring inset
- 10×10 ink-red dots at top-left + bottom-right corners
- Filigree SVG bracket outside the cap (see `.dropcap-wrap .filigree`)

**Use drop caps for:** first paragraph of a major section, lesson intros in the academy viewer, announcement first-letter.
**Don't overuse.** One per surface is enough.

## Field input

Fields use `--font-display` italic at 22px on a 1.5px `--bronze` bottom border that becomes `--lantern` on focus. No box. See `.field` in the reference HTML.

## Never use

- Inter, Roboto, Arial, system-ui, Space Grotesk.
- Sans-serif for body, headings, or UI.
- Any font not in the six above without updating this file + an ADR.
