# Art ingestion workstation

**This is the folder to `cd` to when you're designing the world — adding sprites, tilesets, maps.** Running `claude` here loads only the root CLAUDE.md + this file. Grep / Glob scope is this directory (avatars, tilesets, maps), so Claude isn't sifting through the React + Phaser source on every tool call.

## Folder layout (live)

```
public/
├── avatars/                          ← per-avatar spritesheets
│   ├── avatar-01/                    ← Knight (Aseprite export, cropped)
│   │   ├── idle.png    (128×256 — 2×4 grid)
│   │   ├── walk.png    (576×256 — 9×4 grid)
│   │   └── jump.png    (320×256 — 5×4 grid)
│   ├── avatar-02/                    ← LPC-standard female (cropped from 832×256 generator output)
│   │   ├── idle.png    (128×256 — 2×4 grid)
│   │   ├── walk.png    (576×256 — 9×4 grid)
│   │   └── jump.png    (320×256 — 5×4 grid)
│   ├── avatar-03/ … avatar-08/       ← empty; members render as colored Rectangles until filled
├── tilesets/
│   ├── world.png       (704×704 — 11×11 grid of 64×64 iso tiles; base terrain)
│   ├── world-alt.png   (704×704 — Photoroom-variant referenced at firstgid 122 in world.tmj;
│                        currently a byte-identical copy of world.png — **replace with the
│                        user's real alt PNG when available**)
│   ├── decor.png       (1408×1408 — 11×11 grid of 128×128 cyberpunk props: trees, lamps,
│                        benches, signs, neon floor tiles; used in the decor layer)
│   └── academy.png     (168×166 — single-tile Academy building sprite, placed at tile
│                        (12, 6) via decor layer gid 364)
├── maps/
│   ├── world.tmj       (30×30 iso, 64×32 grid, 3 layers: ground / collision / decor.
│   │                   Uses 4 tilesets chained via firstgid — 1, 122, 243, 364.)
│   └── tavern.tmj      (retained but unused in-scene — see tavern-interior.png below;
│                        still preloaded by BootScene for potential rollback)
├── tavern-interior.png (1536×1024 bar interior — rendered as TavernScene's
│                        static background since 2026-04-19; replaces the tilemap path)
└── transitions/        (1×1 transparent placeholder PNGs shown during building-entry
    ├── tavern.png       fade-ins; swap each file for real art any time, no code change)
    ├── academy.png
    └── market.png
```

## Workflows

### Ingest a new avatar spritesheet

You have a PNG exported from Aseprite, an LPC-standard generator, or similar on your Desktop. The visible art is usually in the top-left region with transparent padding on the right (Aseprite) or on the right half (LPC's 13-column standard grid — cols 0..N-1 filled, rest blank).

Tip: to detect how many columns are actually filled before cropping, alpha-probe the sheet with a short Node script (see the avatar-02 ingestion log 2026-04-19 in `phases/phase-02_status.md`).

1. **Crop + place.** Use the reusable crop helper at `../../../scripts/crop-spritesheet.mjs`:
   ```bash
   node ../../../scripts/crop-spritesheet.mjs \
     ~/Desktop/YOUR_EXPORT.png \
     avatars/avatar-02/walk.png \
     0 0 <WIDTH> <HEIGHT>
   ```
   Where `<WIDTH> <HEIGHT>` = cols × 64 and rows × 64.
2. **Register.** Edit `../components/game/scenes/boot/asset-manifest.ts` → `AVATAR_SHEETS`. Add an entry under the avatar's ID. Copy the shape from `avatar-01`:
   ```ts
   'avatar-02': {
     idle: { key, path, frameWidth: 64, frameHeight: 64, cols, rows,
             directionRowOrder: ['n', 'w', 's', 'e'], frameRate, repeat },
     walk: { … },
     jump: { … },
   }
   ```
3. **Hard-reload the dev server's `/world`.** The sprite swaps in; no scene code changes.

**Conventions:**
- Frame size is **64×64** with the character padded inside. Enforced in config.
- Default row order is `['n', 'w', 's', 'e']` (top to bottom = north / west / south / east) per avatar-01's convention. If the artist used a different row order for a specific sheet, override just that entry's `directionRowOrder`.
- Loop behaviour: `idle` and `walk` loop (`repeat: -1`); `jump` is one-shot (`repeat: 0`).
- If the sheet has extra transparent columns (common Aseprite export), strip them with crop-spritesheet.mjs so the grid is tight.

### Swap or extend the world tileset

Current: `tilesets/world.png` is a 2×-upscaled free iso tileset (115 tiles across dirt, grass, bushes, flowers, stumps, rocks, water). Tile semantics live in `../../../scripts/generate-world-tmj.mjs` — GRASS / PATH / BUSH / FLOWER / ROCK arrays index by row.

To **swap** with a new pack (different art entirely):

1. Upscale the new pack's spritesheet with `../../../scripts/upscale-png.mjs <input> tilesets/world.png <factor>` (factor chosen so output tiles are 64×64).
2. Update the tile-semantic arrays in `../../../scripts/generate-world-tmj.mjs` to match the new pack's layout (which indices are grass / path / rock, etc.).
3. Regenerate `world.tmj` — `node ../../../scripts/generate-world-tmj.mjs`.
4. If the grid dims differ (not 11×11), update the `tilesets[0]` block: `imagewidth`, `imageheight`, `columns`, `tilecount`.

To **extend** the current pack with more tiles (e.g. new prop variants):

1. Decide which rows you need more of. Add them to the PNG (edit in your tool, re-upscale if necessary).
2. Update the tile-semantic arrays in the generator.
3. Regenerate `world.tmj`.

The legacy placeholder generator (`../../../scripts/generate-placeholder-tileset.mjs`) is preserved for reference — not used by the live map any more.

### Redesign the world map in Tiled

1. Open `maps/world.tmj` in the Tiled editor.
2. Tweak layers: `ground` (walkable terrain), `collision` (walls + map edges), `overlay` (decorative props, above avatars via y-sort).
3. Save — Tiled writes valid `.tmj` JSON in-place.
4. **If you change the tileset** (new image file or new tile dimensions): update the `tilesets[0]` block in the `.tmj` and `WORLD_TILE_SIZE` in `../components/game/scenes/world/camera.config.ts` to match.
5. **If you change the map dimensions** (30×30 → something else): update `WORLD_TILE_DIMENSIONS` in the same config file.

Config-shape + tilemap-sync tests in `../components/game/scenes/world/__tests__/configs.test.ts` will fail loudly if the `.tmj` and the configs drift apart. Run `npm test` from the repo root after any edit.

### Add a new avatar slot (avatar-09, avatar-10, …)

**Don't.** The 8-avatar cap is locked in `../components/game/scenes/shared/avatar-palette.ts` → `AVATAR_IDS` and in the `memberships.avatar_id` string constraint. V2 opens this up for creator-customisable avatars. For V1 art work, fill in the 8 existing slots (avatar-02 through avatar-08 are all empty today).

## Files you'll touch most

- `avatars/<avatar-id>/{idle,walk,jump}.png` — drop sprites here
- `../components/game/scenes/boot/asset-manifest.ts` — register new sheets in `AVATAR_SHEETS`
- `../components/game/scenes/shared/avatar-palette.ts` — rename an avatar (`AVATAR_NAMES`) or tweak its placeholder color
- `../components/game/scenes/world/sprites.config.ts` — if real sprites demand different body offset / frame size
- `maps/world.tmj` — world map
- `tilesets/*.png` — tileset art

## Commands cheat sheet (run from this directory)

```bash
# Crop an Aseprite export
node ../../../scripts/crop-spritesheet.mjs <input.png> <output.png> <x> <y> <w> <h>

# Regenerate placeholder tileset (grass/path/wall — edit TILES array in the script first)
node ../../../scripts/generate-placeholder-tileset.mjs

# From anywhere — verify an ingest didn't break things
cd /Users/aria/Documents/Arcadia && npm test && npm run build --workspace @arcadia/web
```

## Gotchas

- **Placeholder fallback is silent.** If `avatars/avatar-02/idle.png` exists on disk but no entry lives in `AVATAR_SHEETS`, avatar-02 still renders as a colored Rectangle. BootScene doesn't auto-discover; it only preloads what's declared.
- **Next 14 dev-mode cache.** After dropping new PNGs + editing code, if `/world` 500s with "Cannot find module './NNN.js'", wipe `../.next/` (from this directory's parent) and restart `npm run dev`. Documented fully in `../components/game/CLAUDE.md` → Known dev-mode gotchas.
- **Middleware auth-gate** excludes PNG + TMJ + JSON from auth — see `../middleware.ts` matcher regex. Adding new extensions (e.g. atlases that ship `.atlas` or `.plist`) means extending that regex too.
- **Hard-reload required** after art swaps. Phaser caches textures in the browser; Cmd+Shift+R busts it.

## When this doc drifts

Update this file whenever you:

- Add a new asset category under `public/` (e.g. `public/ui/` or `public/sounds/`)
- Ship real tileset art that changes the placeholder → real swap workflow
- Change the avatar-spritesheet contract (new action beyond idle/walk/jump, different grid convention)
- Add a new crop/generation script that belongs in the commands cheat sheet above

Last refreshed: 2026-04-19.
