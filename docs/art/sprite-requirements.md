# Arcadia MVP — Sprite & Art Asset Requirements

**Version:** 1.0 | **Last updated:** 2026-04-18 | **Owner:** Arcadia build

This document is the complete art-order spec for the Arcadia MVP. Hand it verbatim to a commissioned illustrator, or use it as a shopping list when evaluating pre-made isometric asset packs. Nothing in this document is negotiable without amending the PRD / TAD.

> **Note on `/docs/art/`.** This folder is new — sibling of `/docs/api/`, `/docs/guides/`, `/docs/mvp/`. Create a matching entry in the `CLAUDE.md` routing table when the next `/init` pass runs. Until then, this file is the canonical art reference.

---

## 1. Scope and style

**Style:** **2.5D isometric.** Orthographic tilemap rendered with isometric-style sprites (2:1 pixel ratio). Depth illusion via y-sorting, not true 3D. See TAD §4.1.

**Art direction brief (three sentences the artist should internalise):**

1. Friendly, readable, low-detail — a modern Stardew-meets-Habbo look. Flat shading with hard edges, limited colour palette, no photorealism.
2. Characters must be recognisable at their rendered gameplay size (~64 px wide at 1x). Exaggerate silhouettes; simplify faces.
3. All assets share one colour palette. Lock the palette before producing final frames.

**Out of scope for MVP:** animated weather, day/night cycle, particle effects beyond basic level-up sparkle, custom avatar cosmetics, creator-customised worlds (V2), seasonal variants.

---

## 2. Technical constants (locked by TAD §4.1)

| Constant | Value |
|---|---|
| Tile grid | 64×32 px, 2:1 isometric diamond |
| Character gameplay size (1x) | ~64 px wide × ~96–128 px tall |
| Target FPS | 60 |
| Rendering | Phaser 3.88+ (WebGL, Canvas fallback) |
| Format | PNG-24 with 8-bit alpha. No JPEG. |
| Source files | `.aseprite` or layered `.psd` required alongside exports |

---

## 3. Scope note: desktop MVP, mobile-friendly assets

PRD §5 locks MVP to desktop / laptop only. PRD §6 marks mobile-optimised UI as out of scope. However, assets are still delivered at three resolutions so mobile / tablet UI can be added post-MVP without re-commissioning art:

- **@1x** — base resolution (standard desktop, non-retina).
- **@2x** — retina desktop / Mac displays.
- **@3x** — high-DPI mobile (iPhone Pro, Pixel Pro, etc.). Future-proofing only; no MVP UI consumes this tier yet.

Every raster asset below is delivered in all three resolutions unless otherwise stated.

---

## 4. Asset list

Six asset groups. Group 1 (avatars) and Group 2 (tilesets) block Phase 1 Week 3. Groups 3–5 block Phase 1 Week 5 and Phase 2. Group 6 (tilemaps) is authored in-house.

### Group 1 — Avatar characters

**Required:** 8 base characters. Diverse across gender, ethnicity, body type, and silhouette so a member can pick an avatar that feels like them.

| Per character | Spec |
|---|---|
| Visual size at 1x | ~64 px wide × ~128 px tall |
| Directions | 4 iso directions — in code: `up` / `down` / `left` / `right` (TAD §5.2); visually NE / SE / SW / NW facing |
| Idle animation | 2 frames per direction (subtle breathing / weight-shift). Loopable at 2 FPS. |
| Walk animation | 4 frames per direction. Loopable at 8 FPS. |
| Total frames | 4 directions × (2 idle + 4 walk) = **24 frames** |
| Delivery format | One Phaser atlas per character: packed PNG + atlas JSON (hash or array). Pack via TexturePacker or equivalent. |
| Level-up sparkle overlay | Single animated sparkle frame set, avatar-agnostic, rendered above the avatar (Phase 5). 6 frames, 12 FPS, non-looping. **One set total, not per character.** |

**Character concept requirements (artist proposes, we approve):**

- 8 characters, of which at least 4 are women, 4 men, and 2 androgynous / gender-ambiguous presentations.
- Ethnic diversity across the set — no all-one-ethnicity line-up.
- Body-type diversity — at least 2 non-slim body types represented.
- Age range: teenage to mid-forties visible; all appear adult.
- Clothing: everyday-casual (sweaters, jackets, hoodies, t-shirts, boots). No weapons. No heavy fantasy armour. No explicit branding.

**Avatar picker previews (`/onboarding/avatar`):**

- 1 preview per character — 256×256 px (1x), delivered @1x/@2x/@3x.
- Front-facing (`down` direction), idle pose, no animation.
- Transparent background.
- Saved separately from the gameplay atlas (the picker doesn't load the full atlas).

**Totals for Group 1:**

- 192 gameplay frames (8 × 24)
- 8 picker previews
- 6 sparkle overlay frames (shared across all avatars)
- 8 atlas PNG + JSON pairs

---

### Group 2 — Tilesets

**Required:** 3 tilesets, all at 64×32 base. Each delivered as one packed PNG tilesheet (sized to a multiple of 64×32), plus an optional Tiled `.tsx` file.

#### 2.1 Outdoor World tileset (Phase 1 WorldScene)

Minimum tile variants:

- **Ground:** grass (3 variants for visual break-up), dirt, cobblestone path (straight + corner + T-junction + cross pieces), stone, short grass, water edge (4 directions + inner/outer corners).
- **Foliage:** 3 tree variants, 2 bush variants, 4 flower variants, 2 grass tufts.
- **Ambient decoration:** 2 rock variants, 1 stump, 1 mushroom cluster, 1 small fountain or water feature.
- **Drop shadows:** soft blob shadow tiles for trees and buildings.

#### 2.2 Tavern Interior tileset (Phase 2 TavernScene)

Minimum tile variants:

- **Floor:** wood plank (2 variants), stone hearth tile, rug (4 tiles forming one 2×2 rug).
- **Walls:** plaster wall, timber-beam wall, wall-top trim (for the iso half-wall effect).
- **Fixtures:** bar counter (3 tiles: left end, middle, right end), hearth / fireplace (3×2 tile sprite), table (1×1), chair (4 directional variants), barrel, crate, bookshelf.

#### 2.3 Shared props / overlay tileset (both scenes)

Usable on top of either tilemap:

- **Signage:** wooden signpost, hanging sign (2 variants).
- **Lighting:** standing lamp, wall torch (with animated flame — 3 frames, 6 FPS).
- **Barriers:** wooden fence (straight + corner + post), low stone wall, stone arch.
- **Furniture overlays:** bench (3 directions), potted plant (2 variants).
- **Interaction hints:** entrance glow / highlight ring tile (used to mark building doorways on the world map — soft pulse, 4 frames, 4 FPS).

**Tileset delivery per set:**

- `outdoor-world.png` + `outdoor-world.tsx`
- `tavern-interior.png` + `tavern-interior.tsx`
- `shared-props.png` + `shared-props.tsx`

Plus `.aseprite` / `.psd` source per tileset.

---

### Group 3 — Building exterior sprites

**Required:** 3 decorative static sprites for the Tavern, Academy, and Market. Placed on the outdoor tilemap as overlay sprites (not tiles). TAD §4.1 specifies this — buildings are sprites, not tilesets.

| Sprite | Approximate size (1x) | Notes |
|---|---|---|
| Tavern facade | 256×256 px | Front-facing (SW-iso perspective). Warm, inviting — wood and stone, visible chimney with smoke (static, not animated). Clear doorway — the gameplay overlap zone will sit over the entrance. |
| Academy facade | 256×320 px | Tall, scholastic — stone and timber with a clock face or crest. Clear arched doorway. |
| Market facade | 320×256 px | Wide, open-fronted — awning, market stall vibes, visible wares (cosmetic). Clear open entrance. |

**Notes:**

- Each sprite: transparent background, `.aseprite` / `.psd` source, delivered @1x/@2x/@3x PNG.
- Exact pixel dimensions may be adjusted ±20% once the World tilemap layout is locked in Phase 1 Week 3 — artist should expect one revision pass after the tilemap is designed.
- **No interior renders of Academy or Market** — those buildings are React pages, not Phaser scenes. Tavern is the only building with an interior tilemap (see Group 2.2).

---

### Group 4 — UI / HUD sprites

| Asset | Details | Quantity |
|---|---|---|
| Level badges | Small circular icons, 32×32 base. **L1 grey, L2 blue, L3 green, L4 gold, L5 purple** (locked by phase-plan Phase 5). Crisp ring outline, level number centred, optional subtle glow on L4 + L5. | 5 |
| Member-count badge | Small pill, 64×24 base. Dark background, white text area, small person icon on the left. Used on building entrances (Phase 2). Background colour only — the number is drawn as text by Phaser / HTML. | 1 |
| XP gain toast text-style | Not a sprite — drawn by Phaser with a bitmap font. **Deliverable:** 1 bitmap font sheet (numbers 0–9, `+`, `XP` characters, uppercase A–Z). 32×32 per glyph at 1x. | 1 font sheet |
| Level-up banner background | Horizontal banner, 640×128 at 1x. Decorative frame around empty centre area (text drawn by Phaser). Subtle animated shimmer acceptable (3 frames, 4 FPS) but static is also fine. | 1 |

All UI sprites delivered @1x/@2x/@3x.

---

### Group 5 — Brand assets

| Asset | Format | Uses |
|---|---|---|
| Arcadia logo — master | SVG (vector) | Single source of truth. |
| Arcadia logo — exports | PNG at 128, 256, 512, 1024 px; transparent background. | Loading screens, favicon, social share. |
| Arcadia wordmark | SVG + PNG exports. | Header, footer. |
| Favicon | `.ico` and `.png` at 16, 32, 48, 180 (Apple touch), 192, 512 px. | Browser tab, PWA manifest. |
| Loading-screen background | 1920×1080 PNG, thematic — World-at-dusk or similar. | Between route transitions (Phase 5 polish). |

Logo / wordmark colour set:

- Primary colour hex — to be specified alongside the locked palette (see §5).
- Must read on both light and dark backgrounds; deliver a light-mode and dark-mode variant if the primary-on-white / primary-on-black contrast drops below WCAG AA.

---

### Group 6 — Tilemaps (authored in-house, not part of the art order)

Listed here for completeness — these files are produced by the build team in Tiled once the tilesets above are delivered. Artist delivery does **not** include these.

| Tilemap | File | Scene | When |
|---|---|---|---|
| World outdoor map | `world.tmj` | WorldScene | Phase 1 Week 3 |
| Tavern interior map | `tavern.tmj` | TavernScene | Phase 2 Week 7 |

Authored as Tiled `.tmj` and stored in `/apps/web/public/tilemaps/`.

---

## 5. Colour palette — deliverable #1

**Before any final frames are produced**, artist delivers a proposed shared colour palette (12–24 swatches) used across every asset in Groups 1–4. Palette is locked after sign-off. Rationale: a shared palette is the difference between a cohesive world and a mixed-source asset dump.

Palette delivered as:

- Aseprite `.aseprite` palette file OR Adobe `.ase` swatch file, and
- PNG palette strip (all swatches visible) for reference, and
- Hex values listed in a `palette.md` alongside the swatches.

---

## 6. Delivery, naming, licensing

### Naming convention

```
avatars/
  char-01/
    char-01-atlas.png
    char-01-atlas.json
    char-01-preview.png
    char-01-source.aseprite
  char-02/...
  ...
  shared-sparkle-atlas.png
  shared-sparkle-atlas.json

tilesets/
  outdoor-world.png
  outdoor-world.tsx
  outdoor-world.aseprite
  tavern-interior.png
  ...

buildings/
  tavern-facade.png     (@1x)
  tavern-facade@2x.png
  tavern-facade@3x.png
  tavern-facade.aseprite
  ...

ui/
  level-badge-1.png  (+@2x, @3x)
  ...
  bitmap-font.png + .fnt

brand/
  arcadia-logo.svg
  arcadia-logo-128.png
  ...

palette/
  palette.aseprite
  palette.png
  palette.md
```

All kebab-case, zero-padded indices where relevant.

### Licensing (non-negotiable)

- **Full commercial rights, transferable.** Assignment of copyright to the project.
- Artist retains portfolio-use rights (may show the work in their portfolio).
- No third-party reference material copied — everything original or properly licensed with proof.
- If any asset uses third-party brushes / patterns, include licence proof in the delivery.

Pre-made packs (e.g. Kenney.nl) are acceptable for MVP if released under **CC0** or equivalent public-domain dedication. Any "royalty-free but attribution required" pack is not acceptable — attribution in a shipping product is operational debt.

### Timeline (MVP-critical path)

| Milestone | Latest acceptable date | Blocks |
|---|---|---|
| Palette + character style sample (1 character, 1 direction, walk cycle) | End of Phase 0 Week 2 | Phase 1 Week 3 cannot start without style approval |
| All 8 avatar atlases + 3 tilesets + 3 building facades | End of Phase 1 Week 3 (start of Week 4 work) | Phase 1 avatar movement and building entry |
| UI badges + bitmap font + logo | End of Phase 2 Week 6 | Phase 2 Tavern chat UI and Phase 5 XP feedback |
| Loading-screen background + polish pass | End of Phase 5 Week 12 | Loom demo recording |

### Review process

1. Artist delivers palette + 1 character sample at the end of Week 2.
2. We sign off within 48h, or return written feedback.
3. Full Group 1 + Group 2 delivery end of Phase 1 Week 3.
4. One revision round per asset included — further rounds quoted separately.

---

## 7. Summary totals

| Group | Count |
|---|---|
| Avatar frames (gameplay) | 192 |
| Avatar picker previews | 8 |
| Level-up sparkle frames (shared) | 6 |
| Tilesets | 3 |
| Building facade sprites | 3 |
| Level badges | 5 |
| Member-count badge | 1 |
| Bitmap font sheet | 1 |
| Level-up banner | 1 |
| Logo / wordmark / favicon set | 1 set |
| Loading-screen background | 1 |
| **Minimum deliverables** | ~220 raster assets + 1 palette + source files |

---

*— End of sprite requirements v1.0 —*
