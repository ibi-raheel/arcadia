// Dev-only coordinate grid overlay. Draws faint lines every `spacing`
// pixels over the world bounds and labels every `labelEvery` pixels so
// a builder can read off exact coordinates of things they want to
// place (spawn points, trigger centres, etc.) straight from the
// preview deploy.
//
// Intended use: drop `drawDebugGrid(this, ...)` at the end of a scene's
// create() during layout-tuning passes. Remove or gate behind a URL
// param / env flag before a real ship.

import type Phaser from 'phaser';

import { addCrispText } from './crisp-text';

export type DebugGridOptions = {
  /** World-pixel width to cover. */
  readonly width: number;
  /** World-pixel height to cover. */
  readonly height: number;
  /** Pixel spacing between grid lines. Default 100. */
  readonly spacing?: number;
  /** Pixel spacing between coordinate labels. Default 200. */
  readonly labelEvery?: number;
  /** Depth of the grid graphics. Default very high so it draws on top. */
  readonly depth?: number;
};

export function drawDebugGrid(scene: Phaser.Scene, opts: DebugGridOptions): void {
  const spacing = opts.spacing ?? 100;
  const labelEvery = opts.labelEvery ?? 200;
  const depth = opts.depth ?? 9_999_999;

  const gfx = scene.add.graphics();
  gfx.setDepth(depth);

  // Minor lines every `spacing`.
  gfx.lineStyle(1, 0x66ff66, 0.25);
  for (let x = 0; x <= opts.width; x += spacing) {
    gfx.beginPath();
    gfx.moveTo(x, 0);
    gfx.lineTo(x, opts.height);
    gfx.strokePath();
  }
  for (let y = 0; y <= opts.height; y += spacing) {
    gfx.beginPath();
    gfx.moveTo(0, y);
    gfx.lineTo(opts.width, y);
    gfx.strokePath();
  }

  // Major lines every `labelEvery`.
  gfx.lineStyle(1.5, 0x66ff66, 0.55);
  for (let x = 0; x <= opts.width; x += labelEvery) {
    gfx.beginPath();
    gfx.moveTo(x, 0);
    gfx.lineTo(x, opts.height);
    gfx.strokePath();
  }
  for (let y = 0; y <= opts.height; y += labelEvery) {
    gfx.beginPath();
    gfx.moveTo(0, y);
    gfx.lineTo(opts.width, y);
    gfx.strokePath();
  }

  // Coordinate labels at each major intersection — "x,y".
  const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '14px',
    color: '#aaffaa',
    stroke: '#0a1a0a',
    strokeThickness: 3,
  };
  for (let x = 0; x <= opts.width; x += labelEvery) {
    for (let y = 0; y <= opts.height; y += labelEvery) {
      const t = addCrispText(scene, x + 4, y + 2, `${x},${y}`, labelStyle);
      t.setDepth(depth + 1);
    }
  }
}
