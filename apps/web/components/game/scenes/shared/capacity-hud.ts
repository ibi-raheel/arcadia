// Small capacity indicator pinned to the camera's top-right corner. Renders:
//   "<label> · <count> / <max>"
// Used by Colyseus-backed scenes (world-realm1 / tavern-realm1 / coworking-
// realm1) so members can see how full their current room is before deciding
// to stay or move to another building. Single-player scenes don't create one.
//
// "Gracefully" means: invisible until the first setCount() call, then fades
// in over 300ms. Zero flicker while Colyseus is still joining.

import type Phaser from 'phaser';

export type CapacityHud = {
  setCount(count: number): void;
  setLabel(label: string): void;
  destroy(): void;
};

export function createCapacityHud(
  scene: Phaser.Scene,
  opts: { readonly label: string; readonly max: number },
): CapacityHud {
  let label = opts.label;
  const { max } = opts;

  const text = scene.add.text(0, 0, '', {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e2e8f0',
    padding: { left: 10, right: 10, top: 6, bottom: 6 },
  });
  text.setScrollFactor(0);
  text.setDepth(3_000_000);
  text.setOrigin(1, 0);
  text.setAlpha(0);
  text.setVisible(false);

  const bg = scene.add.graphics();
  bg.setScrollFactor(0);
  bg.setDepth(2_999_999);
  bg.setAlpha(0);
  bg.setVisible(false);

  function positionAndRedraw(): void {
    const cam = scene.cameras.main;
    const pad = 14;
    text.setPosition(cam.width - pad, pad);
    const w = text.width;
    const h = text.height;
    const x = text.x - w;
    const y = text.y;
    bg.clear();
    bg.fillStyle(0x0f172a, 0.75);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(1, 0x475569, 0.9);
    bg.strokeRoundedRect(x, y, w, h, 8);
  }

  scene.scale.on('resize', positionAndRedraw);

  function setCount(count: number): void {
    text.setText(`${label} · ${count} / ${max}`);
    positionAndRedraw();
    if (!text.visible) {
      text.setVisible(true);
      bg.setVisible(true);
      scene.tweens.add({ targets: [text, bg], alpha: 1, duration: 300 });
    }
  }

  function setLabel(next: string): void {
    label = next;
  }

  return {
    setCount,
    setLabel,
    destroy: () => {
      scene.scale.off('resize', positionAndRedraw);
      text.destroy();
      bg.destroy();
    },
  };
}
