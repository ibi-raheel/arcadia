# Frontend Designer — Arcadia

This workspace is Arcadia's design brain. When you are in this folder, OR you are touching React UI anywhere in `/apps/web`, you shift into frontend-designer mode.

## Invoke this skill (always)

**`frontend-design:frontend-design`** — installed 2026-04-23 (ADR 0009). Auto-invoke for any React UI/UX work: components, pages, layouts, modals, redesigns, or styling beyond trivial tweaks.

**Skip for:**
- `apps/web/components/game/scenes/**` (Phaser scenes — game rendering; governed by per-scene CLAUDE.md)
- Pure logic / server-action / validator files (no UI surface)

## The aesthetic — v4.5 · midnight scriptorium

Hand-kept, lantern-lit, made-of-paper. A dark room around a pool of warm light on a dark-oak desk. Everything on that desk is vellum, scrolls, ledgers, envelopes, journals — bound with leather cords, sealed with wax, pinned with bronze studs. Slightly tilted, never pixel-aligned. Serifs and marginalia; no sans-serif.

**Canonical reference:** `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`. When text docs and the HTML disagree, the HTML wins until reconciled in a new ADR.

## Rules (in priority order)

1. **Read `areas/<area>.md` BEFORE designing that surface.** Every React surface gets a committed direction there. Don't improvise across sessions.
2. **Update `areas/<area>.md` WHEN you commit to a direction.** The rationale has to survive future-you.
3. **Use the tokens.** `system/tokens.md` is the palette. Don't introduce new colors without updating it.
4. **Fonts are locked** — IM Fell English / IM Fell English SC / EB Garamond / Cormorant Garamond / Caveat / JetBrains Mono. No Inter, Roboto, Arial, system-ui.
5. **Every surface has a grain.** Cards are one of the six primitives in `system/surfaces.md` (scroll / vellum / ledger / envelope / journal / map). No flat rectangles with no texture.
6. **Slight rotations everywhere.** Cards live at ±0.4° to ±1.2°; vellum tags at ±2°. Nothing sits on the pixel grid. Buttons, fields, and nav centers are NOT rotated.
7. **Warm pool, dark room.** Vellum/parchment surfaces sit inside a `--night-deep` room with a radial lantern pool overhead. The light pool is a structural element, not decoration.
8. **Speak the lexicon.** See `system/voice.md` — doorway (login), host (creator dashboard), hub (home), the kit (the design system), wanderer/scribe/keeper (role chips).

## Anti-rules

- No Inter / Roboto / Arial / system-ui / Space Grotesk.
- No purple-on-white gradients.
- No flat-white cards. No shadcn-default look (primitives are fine if restyled to the kit).
- No "AI slop" — cookie-cutter spacing, predictable layouts, everything centered.
- No emojis in production UI (ornaments like ✦ ❦ ☉ are allowed as geometric ornaments, not emoji).
- No sans-serif for headings or body. Serifs only; JetBrains Mono only for tiny chrome (timestamps, tags, kickers).

## Workflow

1. User asks for a surface (new page / component / redesign).
2. Open `areas/<area>.md`. If it has a committed direction, follow it. If not, write one first (Purpose / Mood / Signature moves / Primitives used / Copy voice). Wait for confirmation before coding.
3. Invoke `frontend-design:frontend-design` skill.
4. Build in `/apps/web/...`.
5. Visual-check in Chrome against `reference/*.html` (Claude in Chrome MCP).
6. Append a dated note to `areas/<area>.md` describing what shipped.
7. If the surface taught something reusable, fold it back into `system/`.

## Files

- `CONTEXT.md` — workspace orientation.
- `system/tokens.md` — all color + font tokens.
- `system/typography.md` — font roles, pairings, sizes, drop caps.
- `system/surfaces.md` — the six paper/material primitives.
- `system/ornaments.md` — wax seals, bronze studs, iron nails, leather cord, inkwell, medallions.
- `system/motion.md` — sway, rotations, hover, focus.
- `system/voice.md` — lexicon.
- `areas/<area>.md` — committed direction per React surface.
- `reference/*.html` — canonical HTML mockups. Source-of-truth.
- `reviews/YYYY-MM-DD_<surface>.md` — post-implementation design reviews.

## Cross-references

- Root `CLAUDE.md` routes the UI-heavy rows (Web client, Creator dashboard, Academy React viewer, Market `MarketOverlay` + four-stall dashboard, Creator analytics) here.
- Technical architecture: `/planning/architecture/` and `/docs/mvp/tad.md`.
- This workspace's existence is recorded in ADR 0009.
