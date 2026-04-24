// Phaser Text renders to an internal canvas at resolution × 1 by default and
// the browser upscales it on HiDPI displays, producing visibly pixelated
// glyphs at small sizes. setResolution(2–3) draws at device-pixel fidelity;
// the browser then downsamples, which is what we want.
//
// Cheaper than bitmap fonts, no extra asset step, works at every size.
// Covers items G1 / S1 / T3 / AC2 in the Phase-7 punch list.

import type Phaser from 'phaser';

/**
 * Target resolution for Phaser Text render canvases. Clamp to a sensible
 * range — 1 is the default (blurry), 3 is usually enough; higher only
 * spends memory without visible gain.
 */
export const CRISP_TEXT_RESOLUTION =
  typeof window !== 'undefined' ? Math.min(3, Math.max(2, window.devicePixelRatio)) : 2;

/**
 * Drop-in replacement for `scene.add.text(...)` that renders crisply on
 * HiDPI displays. Use wherever a Text object lives in the world or the HUD.
 */
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, style).setResolution(CRISP_TEXT_RESOLUTION);
}
