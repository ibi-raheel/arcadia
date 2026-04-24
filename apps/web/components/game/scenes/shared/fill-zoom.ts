// Compute the minimum zoom that eliminates letterbox/pillarbox for a scene
// whose world bounds are smaller than the browser viewport. Scenes pair this
// with their configured zoom (`Math.max(configured, fillZoom)`) so a scene
// that's intentionally zoomed in (interior close-up) keeps its design zoom,
// and only gets bumped up when the viewport would otherwise expose bare
// canvas beyond the image.
//
// Covers Phase 7 items AC1, T1, M3, CW1 (partial — the "image doesn't fill
// space" complaints). Every Arcadia Phaser mount uses `Phaser.Scale.RESIZE`,
// so the canvas always matches the container; we just need to pick a zoom
// that makes `world × zoom >= canvas` on both axes.

import type Phaser from 'phaser';

/**
 * Minimum zoom factor that makes `world × zoom ≥ canvas` on both axes.
 * Pure — unit-testable without Phaser.
 */
export function fillZoomFor(
  canvasWidth: number,
  canvasHeight: number,
  worldWidth: number,
  worldHeight: number,
): number {
  if (worldWidth <= 0 || worldHeight <= 0) return 1;
  return Math.max(canvasWidth / worldWidth, canvasHeight / worldHeight);
}

/**
 * Apply `max(configuredZoom, fillZoom)` to the scene's main camera. Safe to
 * call from `create()` and again from `scene.scale.on('resize', ...)` so the
 * scene re-fits when the browser is resized.
 */
export function applyFillZoom(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  configuredZoom: number,
): void {
  const fill = fillZoomFor(scene.scale.width, scene.scale.height, worldWidth, worldHeight);
  scene.cameras.main.setZoom(Math.max(configuredZoom, fill));
}
