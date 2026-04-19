# Tiled GUI quickstart for Arcadia

A step-by-step for opening `apps/web/public/maps/world.tmj` in the Tiled map editor, painting a map by hand, and saving back. No code required.

---

## 0. Install Tiled (one time)

**macOS**: [https://www.mapeditor.org](https://www.mapeditor.org) → Download → open the `.dmg` → drag Tiled to Applications. Free; open source.

Homebrew alternative: `brew install --cask tiled`.

---

## 1. Open the map

```
File → Open → apps/web/public/maps/world.tmj
```

You'll see a 30×30 isometric diamond in the centre of Tiled's canvas.

The left sidebar shows **Layers** (ground / collision / overlay). The right sidebar shows the **Tileset** (`world.png`, the 11×11 grid of 64×64 tiles).

If the tileset doesn't appear: `Map → Map Properties → Embedded tilesets` and confirm it's linked. If the image looks broken (red X), Tiled may need you to re-open the map after pointing at `../tilesets/world.png` via `Map → Edit Tileset`.

---

## 2. Understand the three layers

Click a layer name in the left sidebar — only that layer is editable.

| Layer | What to paint here | Notes |
|---|---|---|
| **ground** | Grass base + dirt paths | Tiles 22–32 for grass, 0–4 for path. Every cell in the map should have a ground tile — even under buildings, for when we swap Rectangle placeholders for facade sprites. |
| **collision** | Rocks (walls), building footprints, map-edge ring | Anything on this layer blocks avatar movement. Tiles 77–87 are gray rocks. The ring at x=0/x=29/y=0/y=29 prevents the avatar walking off the world. 5×5 blocks at Tavern / Academy / Market footprints keep the avatar from entering the zones (building entrance Zones are positioned just outside these blocks and trigger the fade-to-page transition). |
| **overlay** | Short decorations (flowers, small bushes) | Renders above ground but below the avatar (ADR layer-depth config). Do **not** put tall trees here — they'd always render behind the avatar, which reads wrong. Tall decor becomes individual Sprites later. |

---

## 3. Paint something

1. **Select the layer** (click "ground" in the Layers panel).
2. **Pick a tile** from the Tilesets panel on the right — click a grass variant.
3. **Pick the Stamp tool** (top toolbar, shortcut `B`).
4. **Click a cell** on the canvas — that cell gets that tile.

Other handy tools:
- **Bucket fill** (`F`) — fills a contiguous region of same-tile cells.
- **Random fill** — select multiple tiles in the tileset with Shift+click, and the Stamp tool will randomly pick one of them per click. Great for natural grass variation.
- **Eraser** (`E`) — clears a cell back to empty.
- **Rectangle select + fill** — select an area with `R`, then press Enter after choosing tiles.

---

## 4. Save

`File → Save` (⌘S). Tiled writes valid `.tmj` JSON in place. No version bumping needed — Phaser reads the same file Tiled wrote.

---

## 5. See it in the game

Hard-reload the dev server's `/world` (⌘⇧R). Phaser re-fetches the tilemap. Changes are visible immediately.

If you don't see changes:
- Cache: Phaser caches textures; use ⌘⇧R not ⌘R.
- Dev server: confirm `npm run dev --workspace @arcadia/web` is still running (check terminal).
- Next 14 cache glitch: if `/world` 500s, `rm -rf apps/web/.next` and restart `npm run dev`. Full recipe in `apps/web/components/game/CLAUDE.md`.

---

## 6. Common edits

### Add a path connecting two points

Select the **ground** layer, pick a path tile (0–4), click cells along the route you want. Keep it continuous so the avatar has a visually obvious walkway.

### Make an island

Select the **collision** layer, draw a ring of rock tiles enclosing some cells; the rocks block the avatar from entering.

### Change a building's size

Select the **collision** layer, edit the 5×5 block's size. Then update `apps/web/components/game/scenes/world/sprites.config.ts` → `buildings.<name>.footprintRect` + `entranceTile` + `exitTile` to match. The config-shape test (`configs.test.ts → sprites.config ↔ world.tmj sync`) will fail on CI if entrance/exit tiles end up inside a collision block, which catches mismatches.

### Move the spawn tile

Edit `sprites.config.ts` → `avatar.spawnTile`. Tile-sync test will verify the new spawn tile is walkable (no collision).

---

## 7. Don't do these

- Don't change `tilewidth` / `tileheight` in `Map → Map Properties`. Our configs expect 64×32 grid + 64×64 source tiles; changing either breaks iso-math + collision.
- Don't rename the layers. `ground`, `collision`, `overlay` are exact strings that `WorldScene.ts` + `layers.config.ts` look for.
- Don't paint onto the `collision` layer with decorative intent — anything there is a wall. If you want a visible rock that's *not* a blocker, put it on the `overlay` layer instead (but it'll render below the avatar, not above).
- Don't add a new layer in Tiled. `layers.config.ts` enumerates the three layers explicitly; a fourth would be ignored silently.

---

## 8. If the map starts to look good and you want to snapshot it

`git status` should show `apps/web/public/maps/world.tmj` as modified. Commit with a message describing the design intent:

```bash
git add apps/web/public/maps/world.tmj
git commit -m "world map: path from spawn to pond, rocky foothills north"
```

Push. Vercel preview will rebuild with your map.

---

## Further reading

- Tiled documentation: [https://doc.mapeditor.org](https://doc.mapeditor.org) — Stamp, Terrain, and Wang tools get fancy for repeating ground patterns.
- Art-workstation CLAUDE.md: `apps/web/public/CLAUDE.md` — ingestion workflows for new sprite / tileset packs.
- Generator script: `scripts/generate-world-tmj.mjs` — regenerates the map programmatically if you ever want to reset to a known-good baseline.

Last refreshed: 2026-04-19.
