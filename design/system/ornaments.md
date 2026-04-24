# Ornaments — hardware, seals, decoration

The small metal and organic things that pin, seal, bind, and reward. Source: sections IV–VII of `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`.

## Hardware

### Wax seal — `.wax`

Oxblood-to-wax radial, 60×60 circle, tilted `-8°`. Inner dashed ring at 4px inset. Display font italic letter inside (usually `A` for Arcadia; per-surface letters are fine — `P` for published, `L` for locked).

**Use for:** signing published content, gating CTAs ("seal it" = commit/submit), status badges on ledger rows, envelope closures.
**Variants:**
- 60px standard
- 48px small (inside envelope cards)
- Never smaller than 40px — the letter loses legibility.

**Motion:** on first paint, every `.wax` stamps down — starts at `scale(2.2) rotate(-30deg) opacity 0` with a 3px blur, overshoots to `scale(0.92) rotate(-5deg)` at 60%, then settles to rest. `stamp` keyframe, `cubic-bezier(0.25, 1.2, 0.5, 1)`, 0.7s, delayed 0.9s so it lands after the card it's on has arrived. See `system/motion.md` §3.

### Bronze stud — `.stud`

14×14 bronze radial circle, raised with two-layer inset shadows (highlight from top-left, shadow on bottom).

**Use for:** pinning a vellum card to the desk at its corners, non-interactive metal accents, fixing points. Decorative only — don't tie them to affordances.

### Iron nail — `.iron-nail`

10×10 muted gray-black radial circle. Darker, duller than the stud.

**Use for:** heavy scrolls and maps that need a structural pin. Implies weight — don't use for light vellum.

### Leather cord

`linear-gradient(180deg, --leather, --leather-dark)`, 5px tall, runs horizontally across the top of a `vellum-card.corded` or vertically as a spine binding.

**Use for:** binding vellum/journal cards. Implies that the content is a leaf in a larger book.

### Desk corner bosses — `.desk::before / ::after`

Two 32×32 rounded squares (4px radius) at the top-left and top-right of the desk. Bronze radial. These are STRUCTURAL, not content. Don't repeat them on sub-surfaces.

### Bronze corner bosses rule

Only the top-level `.desk` wears bosses. Cards sitting on the desk do not.

## Seals & sealing affordances

Wax seals carry semantic weight:
- **Live (bright crimson)** — published, active, signed.
- **Aged verdigris** (for medallions, not wax) — earned a while back.
- **Unearned** — neither wax nor bronze. Gray matte.

## Inkwell + quill

SVG composition (`<ellipse>` base + bronze cylinder body + dark inset + quill arc). 58×72 typical, 28×36 inline.

**Use for:** decorating "scriptorium" moments — the hub's lantern corner, a "write a note" entry point, the sidebar of the creator dashboard. Decorative. Can also be a click affordance if it leads to a compose/edit action.
**Don't:** use as a generic bullet. It carries a specific verb ("write, sign, inscribe") — reserve it for that.

## Guild medallions

108×108 circle (or 80×80 small), bronze radial, two concentric inner rings (solid 2px + dashed 1px), centered emblem (✦ ☉ ❦ ✧ ◈ ❂) above a two-line inscription in italic display at 14px.

### Three states

1. **Freshly cast** — default bronze. Full color. The achievement was recently earned.
2. **Aged verdigris** — `--verdigris` radial. The achievement was earned long ago and has patinated.
3. **Unearned** — flat dark gray radial, 60% opacity, label quieted to `rgba(150, 140, 120, 0.35)`. Don't hide unearned medallions — show what's available.

### Motion (new — 2026-04-23)

- **Arrival (scroll set-piece only):** when rendered inside a `.med-grid`, each `.med-cell` drops onto the scroll with a 0.7s `medallion-drop` at 80ms cadence. Overshoot on land.
- **Breath (ambient):** `.medallion:not(.unearned)` runs `gilt-breath` on a 6s cycle — a warm inner-glow box-shadow that rises and falls. Unearned medallions hold still.
- **Gleam (hover):** on hover, a specular highlight sweeps across the bronze ring. 40%-wide linear gradient `transparent → rgba(255,232,180,0.55) → transparent`, `skewX(-14deg)`, translates from `-120%` to `220%` over 1.3s. The `.medallion` React component renders a child `<span className="gleam" />` which owns the sweep — don't try to add it via pseudo-element; the medallion's own `::before` / `::after` are already spoken for (rings).
- Unearned medallions do not gleam.

### Usage

- **Academy:** course-completion medallions.
- **Host dashboard:** creator-milestone medallions (first class, 100 members, etc.).
- **Member profile:** the earned-and-aging gallery.
- **Don't:** use medallions as generic badges for roles (that's what chips are for, in `voice.md`).

## Chips (role tags)

Mono, uppercase, letter-spaced, dashed-border pills. Three color variants in the reference HTML:
- `scribe` — ink-soft text on bronze-tinted bg, dashed bronze border.
- `keeper` — wax red text on wax-tinted bg, dashed wax-deep border.
- `wanderer` — verdigris text on verdigris-tinted bg, dashed verdigris-2 border.

Specs: `padding: 5px 10px; border-radius: 12px; font-size: 10px; letter-spacing: 1.4px;`. JetBrains Mono, uppercase.

**Use for:** role labels, category tags, guild affiliations.
**Don't use for:** status (use wax seals), actions (use buttons), navigation (use vellum tags).

## Vellum tags — `.vtag`

Navigational "shipping label" tags: clip-path with a notched left edge where the cord hole is punched. Tilted, bronze-to-vellum gradient. Active state switches to a lantern-warm gradient + lift.

**Use for:** top-level nav (hub, doorway, host, the kit).
**Don't use for:** secondary nav, tabs, breadcrumbs — those need a different primitive.

## Ornament characters

These are not emoji — they are geometric ornaments used for dividers, medallion emblems, and bullet decoration:
- `✦` — the section ornament (default divider center)
- `☉` — sun; earned-seven-days
- `❦` — fleuron; kind-word medallion
- `✧` — light ornament; lantern-held
- `◈` — diamond; host-a-circle
- `❂` — star ornament; fortnight-long

Render them in `--ink-red`, `--gilt`, or inside medallions.

## Splatters

`.splatter` class is reserved for subtle ink-splash decorations. Positioned absolutely, opacity ~0.8. Keep one or two per surface max — decorative noise, not content.
