# Tokens — v4.5 midnight scriptorium

Lifted verbatim from `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`. When you introduce a new color or font in `/apps/web`, add it here first.

## Colors

### Night — the darkness around the pool

| Token | Hex | Role |
|-------|-----|------|
| `--night` | `#050208` | Room base, just barely purple-black |
| `--night-2` | `#0c0612` | Slightly lifted for layering |
| `--night-deep` | `#000000` | The vignette edge / deepest shadow |
| `--night-vignette` | `rgba(0,0,0,0.88)` | Radial vignette overlay |

### Desk — dark stained oak

| Token | Hex | Role |
|-------|-----|------|
| `--desk` | `#3a2614` | Oak base |
| `--desk-warm` | `#4a2f18` | Mid-tone where the light reaches |
| `--desk-lit` | `#6a421f` | Center of the light pool on the desk |
| `--desk-edge` | `#1e1208` | Dark edges outside the pool |
| `--desk-grain` | `rgba(0,0,0,0.4)` | Wood-grain overlay |

### Paper — aged vellum

| Token | Hex | Role |
|-------|-----|------|
| `--vellum` | `#e8d5a5` | Primary paper surface |
| `--vellum-2` | `#d9c38a` | Shaded vellum |
| `--vellum-3` | `#c4a971` | Deep shadow on vellum |
| `--vellum-shadow` | `#a98a52` | Scroll-curl shadow |
| `--parchment` | `#d9bf88` | Warmer paper variant |
| `--parchment-2` | `#c8ac72` | Deeper parchment |
| `--scroll` | `#e3ce98` | Highlight edge of a scroll |
| `--ledger` | `#d4b984` | Ledger page base |

### Lantern — hero warmth

| Token | Hex | Role |
|-------|-----|------|
| `--lantern` | `#ffb84a` | Primary accent — active states, focus |
| `--lantern-2` | `#e69a2a` | Shaded lantern |
| `--lantern-core` | `#ffde9b` | Brightest flame core |
| `--flame` | `#fff3c8` | White-hot flame center |
| `--glow` | `rgba(255,184,74,0.40)` | Warm halo around lit elements |
| `--glow-soft` | `rgba(255,184,74,0.18)` | Soft halo for quiet glows |

### Bronze — primary metal

| Token | Hex | Role |
|-------|-----|------|
| `--bronze` | `#8a6a3a` | Primary metal mid-tone |
| `--bronze-hi` | `#b88c52` | Lit highlight on bronze |
| `--bronze-bright` | `#d4a868` | Specular top on bronze |
| `--bronze-deep` | `#5a3f22` | Shadow inside bronze |
| `--bronze-dark` | `#3e2a14` | Deepest bronze line-weight |
| `--verdigris` | `#5a7a5c` | Aged bronze (patina) |
| `--verdigris-2` | `#3e5c44` | Deep verdigris |

### Wax — blood / crimson

| Token | Hex | Role |
|-------|-----|------|
| `--wax` | `#8f2530` | Wax seal primary |
| `--wax-deep` | `#5a1820` | Wax shadow |
| `--crimson` | `#a8364a` | Brighter crimson for accents |
| `--oxblood` | `#6d1a24` | Marginalia red (handwritten notes) |

### Ink & gilt

| Token | Hex | Role |
|-------|-----|------|
| `--ink` | `#140a05` | Body copy (on vellum) |
| `--ink-soft` | `#3a2418` | Softer body |
| `--ink-faint` | `#6e5544` | Captions, tiny text |
| `--ink-quiet` | `#8f7b68` | Disabled, endnote |
| `--ink-blue` | `#1f3147` | Illuminated blue (drop-cap ground) |
| `--ink-red` | `#8a2838` | Illuminated red (drop-cap corner dots) |
| `--gilt` | `#c9a14a` | Gold leaf — drop cap letter |
| `--gilt-hi` | `#e8c876` | Gilt highlight / glow |
| `--gilt-deep` | `#8e6e28` | Gilt shadow |

### Leather & cord

| Token | Hex | Role |
|-------|-----|------|
| `--leather` | `#3a1c10` | Envelope base, cord upper |
| `--leather-dark` | `#1a0a06` | Envelope shadow, cord lower |
| `--cord` | `#6a4a28` | Rope binding |

## Fonts

| Token | Family | Role |
|-------|--------|------|
| `--font-display` | IM Fell English (italic) | Page titles, headlines, quest names |
| `--font-caps` | IM Fell English SC | Chapter headers, nav labels, ledger heads |
| `--font-body` | EB Garamond | Paragraphs, copy, descriptions |
| `--font-script` | Cormorant Garamond | Backup display / italics |
| `--font-hand` | Caveat | Marginalia, sticky notes, byline scrawls |
| `--font-mono` | JetBrains Mono | Kickers, tiny all-caps, timestamps, tags |

Details in `typography.md`.

## How to consume in `/apps/web`

Current state: Next.js + Tailwind 3. The cleanest wiring is:

1. Add the CSS custom-property block (the `:root { --night: ...; }` section from `reference/*.html`) to `apps/web/app/globals.css`.
2. Import the Google Fonts via `next/font` in `apps/web/app/layout.tsx` — IM Fell English, IM Fell English SC, EB Garamond, Cormorant Garamond, Caveat, JetBrains Mono. Assign to the matching CSS var.
3. Extend `tailwind.config.ts` with the palette and `fontFamily` keys so Tailwind utilities can reach every token (`bg-vellum`, `text-ink`, `font-display`, etc.).

This wiring has NOT shipped yet. Do it in the first phase that builds a real UI surface against these tokens. Record the decision in this file or in a new ADR when it lands.

## Source

Full CSS (including the radial gradients, text-shadows, and pseudo-element stacks these tokens plug into) lives in `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`.
