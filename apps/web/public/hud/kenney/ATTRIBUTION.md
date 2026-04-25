# Kenney Fantasy UI Borders

Source: https://kenney.nl/assets/fantasy-ui-borders
License: CC0 1.0 Universal (public domain — no attribution required, but credited here voluntarily per Kenney's request).
Original archive: `kenney_fantasy-ui-borders.zip` v1.0 (2023-12-03).

## What's checked in

A small subset of the original 140-file pack — only the PNGs the Player HUD actually uses, to keep `public/` lean.

| File              | Source                                  | Usage in repo                                                                                     |
|-------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------|
| **`panel-bronze.png`** | derived (see below)                     | **Live 9-slice** for the `PlayerBar` rim. Bronze ornaments — see "Recolour pipeline" below.       |
| `panel.png`       | `PNG/Default/Panel/panel-001.png`       | Original cream-ornament source. Kept on disk as the reference + recolour input.                    |
| `panel-002.png`   | `PNG/Default/Panel/panel-002.png`       | Reserve / alternate ornament style (kept in case we want a second variant).                       |
| `border.png`      | `PNG/Default/Border/panel-border-000.png` | Reserve for inner-element borders (small framed icons inside a panel).                          |
| `divider.png`     | `PNG/Default/Divider/divider-000.png`   | Optional horizontal rule inside panels (matches the Sample.png "Inventory").                      |
| `LICENSE.txt`     | `License.txt`                           | Original Kenney CC0 license text.                                                                  |

If we need additional variants (e.g. ornament style or a "Double" thicker border), grab them from the original archive and append a row above. Don't blanket-import the whole pack — most files are unused.

## Recolour pipeline

The original Kenney panels ship with cream-coloured ornaments. The HUD reads "all dark brown," so the live variant `panel-bronze.png` was produced by recolouring every non-transparent pixel to `--bronze-bright` (#d4a868) via `scripts/tint-panel.mjs` (one-off pngjs script). Alpha is preserved so the corner ornament edges stay anti-aliased. To re-roll the tint after dropping a new variant:

```bash
node scripts/tint-panel.mjs apps/web/public/hud/kenney/panel.png apps/web/public/hud/kenney/panel-bronze.png
```

If a future re-skin moves away from bronze, edit the R/G/B constants at the top of `scripts/tint-panel.mjs`.
