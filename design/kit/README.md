# Arcadia Design System

> *A room by lamplight, built by hand.*

**Arcadia** is an online platform where content creators build their own medieval-ish "realms" and invite their community to live inside them. Members can buy and browse creator-made courses in the **Market**, finish them (and earn XP) inside the **Academy**, gather and chat with other players in **Taverns**, and co-work together — voice and music on — inside **Tents**.

The world is styled after a late-medieval scriptorium: candles, vellum, wax seals, bronze studs, hand-illuminated manuscripts. There's a *whisper* of tech/magic — a warm lantern-glow over dark oak — but nothing is cyber, nothing is neon. Everything is kept by hand.

## Sources

- `reference/01-design-system.html` — the single file provided by the team, titled **"Arcadia · v4.5 · the scriptorium"**. It is the canonical visual reference for this design system: colors, type, surfaces, hardware (seals, studs, medallions), drop-caps, buttons, fields, tags, medallions.
- No codebase, Figma, or product screenshots were attached. Component recreations below are extrapolated from the reference HTML in Arcadia's voice — treat UI kits as **high-fidelity style demonstrations** rather than pixel-exact product mirrors.

## Products represented

Four surfaces are implied by the brief and the reference's nav tags (`hub`, `doorway`, `host`, `the kit`):

1. **Market** — browse/buy creator courses (the open fair).
2. **Academy** — enrolled courses; complete lessons, earn XP and medallions.
3. **Tavern** — realtime chat rooms where members gather.
4. **Tents** — coworking spaces with voice + shared music.

A fifth surface — **the Hub** (creator dashboard / realm home) — binds them together.

## Index

| File | What's in it |
|---|---|
| `README.md` | This file — product context + the CONTENT and VISUAL FOUNDATIONS below. |
| `SKILL.md` | Claude Skills-compatible entrypoint. |
| `colors_and_type.css` | CSS custom properties for every color, font, and semantic token. |
| `reference/01-design-system.html` | The original Arcadia design sheet. |
| `assets/` | Logos, icon SVGs, background textures, illustrations. |
| `fonts/` | Webfont references (all currently loaded from Google Fonts — see *Font substitutions*). |
| `preview/*.html` | Individual cards that populate the Design System tab. |
| `ui_kits/market/` | Market (storefront) UI kit. |
| `ui_kits/academy/` | Academy (courseware) UI kit. |
| `ui_kits/tavern/` | Tavern (chat room) UI kit. |
| `ui_kits/tent/` | Tent (coworking space) UI kit. |

---

## CONTENT FUNDAMENTALS

**Voice.** Arcadia speaks like a softly-lit room at 9 p.m. — warm, unhurried, lightly archaic, almost always in the second person. It never barks. It invites. Sentences lean short. Punctuation is gentle: em-dashes, ellipses, tildes. Where a normal app would say *"Log in,"* Arcadia says *"step inside →"*. Where it would say *"Submit,"* it says *"seal it."*

**Casing.** Titles and nav labels are almost always **all-lowercase** ("hub", "doorway", "the kit"). Only proper nouns, small-caps ceremonial labels (`THE TAVERN IS OPEN`), and timestamp-style mono (`FOL · XVII`) use capitals. Sentence case is the default for body copy. ALL CAPS appears only in small-caps type and in mono labels.

**Person.** Second person, singular, familiar — "your folk", "come in", "if you please." Never "users." Occasionally a shared *we* for ceremonial moments ("a room is only as warm as its lantern…").

**Emoji.** Never. Emoji breaks the hand-made spell. Unicode ornaments *are* used — **✦ ✧ ☉ ❦ ◈ ❂ † ✝ ✥** — always in a gilt or bronze color, always as a standalone glyph rather than mid-sentence.

**Hand-scrawled marginalia.** Short, italic-cursive asides in the Caveat font, wrapped in tildes: *~ bring tea ~*, *~ 31 came in today ~*, *~ every swatch, every seal, every scrawl ~*. Used for captions, bylines, sticky-note notes beside a swatch or a medallion. Keep to five words or fewer.

**Roman numerals** are used for section numbers and folio references: *I. colours*, *II. lettering*, *FOL · XVII*.

**Medieval metaphor vocabulary.** Not every word — just enough to keep the spell. Borrow from the set: scroll, ledger, folio, missive, letter, seal, medallion, guild, host, keeper, scribe, wanderer, hearth, doorway, kit, lantern, tavern, tent. Avoid: "page", "submit", "button", "notification", "post".

**Examples lifted from the reference**

- Top-nav tags: `hub`, `doorway`, `host`, `the kit`
- Hero heading: *"a room by lamplight, built by hand."*
- Byline: *"~ every swatch, every seal, every scrawl ~"*
- Section chapter: *"I. colours"*, *"II. lettering"*, *"III. surfaces"*
- Card kickers: *"a rolled scroll"*, *"a flat leaf of vellum"*, *"a ledger page"*
- CTAs: *"step inside →"*, *"seal it"*, *"set aside"*
- Fields: *"your name, if you please"*, *"the word that lets you in"*
- Medallions: *"first hello"*, *"seven suns"*, *"kind word"*, *"lantern held"*, *"host a circle"*, *"fortnight long"*
- Footer: *"an opinion kept by the scribe: a room is only as warm as its lantern and as quiet as its ink."*

**Tone check.** If a line of copy could appear in Stripe or Notion without changing a word — rewrite it.

---

## VISUAL FOUNDATIONS

### Palette

Arcadia's color system is divided into **night** (the space around the page) and **paper** (the surfaces the content lives on), bound together by two metals (**bronze**, **gilt**) and one heat (**lantern**, **wax**).

- **Night / oak** backgrounds — `#050208 → #000000`, edges eaten by heavy radial vignettes. All deep content frames live on night.
- **Vellum / parchment** surfaces — `#e8d5a5 → #c4a971`. Warm, slightly yellowed, always given a noise-texture overlay (fractalNoise SVG at ~0.3 opacity, multiply blend).
- **Bronze** metalwork — `#d4a868 / #8a6a3a / #3e2a14`. Used for fixings (studs, corners, button fills, brand mark). Always rendered as a *radial gradient* with a highlight at ~30% from the top-left to suggest a polished convex metal.
- **Lantern** warmth — `#ffb84a`. This is the hero color. It is used sparingly: the hanging lantern, the drop-shadow glow beneath a primary CTA, the pool of light that falls on the desk.
- **Gilt** — `#c9a14a → #8e6e28`. Gold-leaf color, reserved for drop-cap letters, chapter numerals, and rare illuminated accents.
- **Wax** — `#8f2530 → #5a1820`. Oxblood. Used for seals, destructive actions, ribbons, and illuminated red letters. Always convex with a crimson highlight.
- **Verdigris** — `#5a7a5c`. Aged-bronze green. Success states, aged medallions, quiet reflective content.
- **Ink blue** — `#1f3147`. Lapis. Drop-cap backgrounds, manuscript cover stock.

Full tokens: see `colors_and_type.css`.

### Typography

Five hands, each with a job:

- **IM Fell English (italic)** — display. Headlines, page titles, quest names, CTAs. The late-medieval scribe's hand.
- **IM Fell English SC** — small caps. Chapter headers, navigation labels, ledger heads. Ceremonial, monastic.
- **EB Garamond** — body. Paragraphs, descriptions, copy. Italic variant for flourishes.
- **Cormorant Garamond** — occasional script/display alternate. Quiet and calligraphic.
- **Caveat** — marginalia. Scrawled notes, handwritten captions, sticky annotations, always short, often rotated ~-1°.
- **JetBrains Mono** — the only non-serif. Tiny uppercase labels, timestamps, kicker eyebrows, folio tags. Letter-spaced 1.5–2.5 px, 10–12 px, lowercase forbidden.

> **Font substitution note.** The reference file loads these faces from Google Fonts. We do the same — no TTF files were attached. IM Fell English, EB Garamond, Cormorant Garamond, Caveat, and JetBrains Mono are all available on Google Fonts and are imported at the top of `colors_and_type.css`. **If the brand owns licensed custom faces, please attach them and I will swap the `@import`.**

### Surfaces (the primitives)

Six recurring paper/desk cards. Each has its own texture, shadow, and edge treatment:

1. **Rolled scroll** — both ends curl inward (top/bottom pseudo-elements with ridged gradients). For announcements and dramatic news.
2. **Vellum card** — flat leaf, often bound at the spine with a leather cord (top pseudo-element). Lists, forms, contents.
3. **Ledger page** — ruled horizontal lines, double-stitched left border, wax seal at top-right. Keeper's records, stats, tallies.
4. **Kraft envelope** — dark leather-brown, always houses a small wax seal. For heavy-weight numbers and sealed correspondence.
5. **Graph-paper journal** — thin square grid bleeding through, red margin line at left. Charts, ink lines, sketches.
6. **Map / aged parchment** — darker, more weathered than the scrolls, heavy fractalNoise. Hand-drawn world maps, trails.

Each card tilts by a small random angle (`-1.2° → +1.2°`) to feel hand-placed, never flat-laid-out.

### Backgrounds

- The page itself is always **night** — `linear-gradient(180deg, #050208 0%, #000000 100%)` — with a radial lantern pool at the top center and a heavy radial vignette eating the corners at ~85% opacity.
- Content frames sit on a **desk** surface — a dark stained oak built from three stacked backgrounds: a fractalNoise SVG, a repeating 92°-skewed grain, and a radial gradient from `--desk-lit` at the top down to `--desk-edge` at the corners. Blended multiply-normal-normal.
- Paper cards use fractalNoise SVG overlays at 30–42% opacity, multiply-blended onto the vellum gradient, to keep them feeling fibrous.
- Full-bleed imagery is rare. When used, it should be **warm, candle-lit, slightly sepia-toned** — never cool, never neon.

### Animation

- **Minimal, atmospheric.** The hanging lantern *sways* — a 6-second ease-in-out infinite rotation between -0.8° and +0.8°.
- **Hover transitions** are slow and restrained: 250–300 ms, `transform: translateY(-2px)` plus a brightness bump of ~1.08.
- **No bounces, no springs, no scale-ins.** Paper doesn't bounce; candles flicker.
- **Flame flicker** (future) — subtle opacity oscillation on the flame core, 2–3 s.
- **No loading spinners.** A quill dipping into an inkwell, a wax seal being pressed, or a page turning is preferred.

### Hover / press states

- **Buttons** — hover lifts the surface (`translateY(-2px)`) and slightly brightens the metal (`filter: brightness(1.08)`). Press would settle back to 0.
- **Vellum tags** (nav) — hover rotates the tag back to 0° and lifts by 3 px.
- **Cards** — typically static; any interactivity is indicated by a lantern-glow shadow beneath on hover, not a scale.
- **Fields** — focus swaps the bottom border from bronze → lantern. No ring, no fill change.

### Borders, dividers, shadows

- **Borders** are rare on paper (paper has no stroke; it has shadow). Where present, they're `1px dashed var(--bronze-deep)` for divider lines or `3px double var(--bronze-deep)` for ledger spines.
- **Section dividers** are a pair of short-dashed lines (`repeating-linear-gradient` of bronze dashes) flanking a small ornament (✦) and an italic small-caps label.
- **Shadows** are heavy and warm: `0 18px 36px rgba(0,0,0,0.55)` for a card on the desk, `0 60px 120px rgba(0,0,0,0.85)` for the desk itself. Paper also gets an **inset** `inset 0 0 60px rgba(140,100,40,0.22)` to fake the yellow light pooling on its center.
- **Drop-caps** use three nested box-shadows: outer drop, `inset 0 0 0 2px var(--gilt-deep)` for the gold rule, and `inset 0 0 0 3px var(--night)` for the black border inside it.

### Transparency & blur

Used **sparingly**, and almost never as a frosted-glass effect (too digital, too modern). Where transparency appears:

- The lantern pool (`rgba(255, 184, 74, 0.32 → 0)`), blended screen over the night.
- Noise-texture overlays on paper.
- Scrim vignettes at the edges of the night.
- Tag chips: `rgba(184, 140, 82, 0.2)` with a dashed bronze border.

**No backdrop-filter blur.** Glass is cold; vellum is warm.

### Corner radii

- Paper and cards use `2 → 3px` radii — barely rounded, like cut vellum.
- Ledger cards have an asymmetric `2px 8px 8px 2px` — a spine on the left, softer on the right.
- Buttons and chips are **fully pill** (`30px` / `12px`) — bronze coins don't have corners.
- Medallions, brand marks, wax seals: `50%` — perfect circles, always.

### Cards

A card in Arcadia is never `border-radius: 16px; border: 1px solid #eee`. A card is a surface — vellum, ledger, envelope, scroll — with texture, shadow, tilt, and optional hardware (wax seal, leather cord, stud). When in doubt, reach for `.vellum-card` from `colors_and_type.css` + companion classes in the reference file.

### Layout rules

- **Centered, letterboxed on black** — the night always surrounds the desk. Max desk width: `1240px`. Side gutters: `28 → 44px` minimum.
- **12-column grid** inside the desk (`display: grid; grid-template-columns: repeat(12, 1fr); gap: 28px`).
- **Section numbering** is Roman (I — VII). Every section opens with a dashed divider + chapter label.
- **Asymmetry and rotation** are load-bearing. Straight lines feel printed; Arcadia is hand-placed. Small rotations (-1.5° to +1.5°) on swatches, tags, and cards are mandatory, not decorative.
- **Drop caps** open major text blocks — three-line initial letter on a gilt/wax/verdigris ground, with filigree at the corners.

### Imagery / illustration

- Hand-drawn, ink-on-vellum illustrations are preferred.
- Real photography, if used, should be **warm, candle-lit, sepia / grain / oil-painting**. Never cold, never modern, never stock-photo.
- Full-color illustration is acceptable only in gilt/lapis/wax/verdigris — the illuminated palette, never pastel or neon.

---

## ICONOGRAPHY

Arcadia's icon language is **hand-struck glyphs, not vector-perfect UI icons.** There is no icon font in the reference; there is no Lucide, no Feather, no Heroicons. Where "icons" appear in the reference, they are:

1. **Unicode ornaments** — set in IM Fell English or IM Fell English SC at 18–32 px, colored `--gilt`, `--ink-red`, or `--ink-blue`. The vocabulary is small and deliberate:
   - **✦ ✧** — stars / milestones ("first hello", "seven suns", "lantern held")
   - **❦** — fleuron / kindness ("kind word")
   - **◈** — lozenge / hosting ("host a circle")
   - **❂** — sunburst / duration ("fortnight long")
   - **☉** — sun / days
   - **†** — dagger / footnote
   - **~** — tilde, used in marginalia
   - **→** — simple arrow, used in CTAs ("step inside →")
2. **Hand-drawn SVGs** for bespoke hardware — the lantern itself, the inkwell-and-quill, the wax seal, the bronze stud, the iron nail, the medallion. Each is a small, self-contained SVG composed at the point of use. These are **not reused as icons**; they are furniture.
3. **No emoji. No raster PNG icons.** Emoji breaks the spell; PNGs don't age like ink.

**Recommended CDN substitution (flagged).** If a project genuinely needs utilitarian icons — play/pause, volume, mic, settings — the closest match is **Lucide** (`https://unpkg.com/lucide@latest`) stroked at 1.5 px in `--bronze` or `--vellum`. **This is a substitution**; the brand itself doesn't ship an icon set. When using it, keep icons to ≤16–20 px, never in primary content, and always next to a label typed in IM Fell English SC or JetBrains Mono.

**Placeholders.** Where a real illustration is needed but missing, use a vellum-card with a bronze border and the label *"~ illumination pending ~"* in Caveat. Do not fill with stock icons.

**Assets copied into `assets/`** (see that folder):

- `assets/lantern.svg` — the hanging lantern (hero motif)
- `assets/inkwell-quill.svg` — desk prop, also the loading/empty-state illustration
- `assets/wax-seal.svg` — the "A" wax seal
- `assets/medallion.svg` — the bronze guild medallion
- `assets/ornaments.svg` — a sprite of ✦ ✧ ❦ ◈ ❂ ☉ as SVG paths for crisp rendering
- `assets/logo-arcadia.svg` — the circular brand mark (bronze A)
- `assets/texture-vellum.svg` — the fractalNoise overlay
- `assets/texture-oak.svg` — the desk grain
