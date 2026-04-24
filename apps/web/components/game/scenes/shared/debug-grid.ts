// Dev-only coordinate grid overlay + click-to-reveal coord picker.
// Drops faint lines every `spacing` pixels and brighter lines every
// `labelEvery` pixels with "x,y" labels at each major intersection.
// With `clickToReveal: true`, every pointer click places a small
// crosshair + text marker at the exact world coord clicked, and also
// logs the coord to the browser console.
//
// Intended for layout tuning passes only — wire into a scene's create()
// override while nailing down trigger centres / spawn points, then
// remove the override and delete this file again. Restorable from git
// history if needed for the next layout pass.

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
  /**
   * If true, every pointer click drops a crosshair + coord label at
   * the clicked world coord and console.logs `(x, y)`. Default false.
   */
  readonly clickToReveal?: boolean;
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

  // Coordinate labels at each major intersection.
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

  if (opts.clickToReveal) {
    // Click marker layer — redraws each click. Uses two Graphics + one
    // Text so the marker is visually obvious but ephemeral (last click
    // only; clears on next click). Runs ALONGSIDE any existing
    // pointerdown handler (e.g. OutdoorSceneBase's click-to-move).
    const marker = scene.add.graphics().setDepth(depth + 2);
    const markerText = addCrispText(scene, 0, 0, '', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffee88',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0, 1).setDepth(depth + 3).setVisible(false);

    scene.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer) => {
        const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const x = Math.round(world.x);
        const y = Math.round(world.y);
        marker.clear();
        // Crosshair — thin lines + a ring.
        marker.lineStyle(2, 0xffee88, 1);
        marker.beginPath();
        marker.moveTo(x - 14, y);
        marker.lineTo(x + 14, y);
        marker.moveTo(x, y - 14);
        marker.lineTo(x, y + 14);
        marker.strokePath();
        marker.strokeCircle(x, y, 10);
        markerText.setText(`(${x}, ${y})`);
        markerText.setPosition(x + 16, y - 4);
        markerText.setVisible(true);
        // eslint-disable-next-line no-console
        console.log(`[debug-grid] clicked world coord: (${x}, ${y})`);
      },
    );
  }
}
