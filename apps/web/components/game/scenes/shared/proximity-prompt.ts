// Local-action variant of `enter-prompt.ts`. Same visual pill ("Press
// ENTER to …"), but the activation handler is a caller-supplied callback
// instead of a route navigation. Used when the intended payoff of the
// ENTER press is a React overlay (scroll modal, dialog) rather than a
// page transition.
//
// 2026-04-24 — added alongside the academy/market scene rewire that
// replaced the floating-card podium pattern with a single centrepiece
// interactable (book / crystal) + pop-out scroll.

import type Phaser from 'phaser';

import { addCrispText } from './crisp-text';

export type ProximityTrigger = {
  /** World-pixel coordinates of the trigger's centre. */
  readonly centerX: number;
  readonly centerY: number;
  /** Circular activation radius. */
  readonly radius: number;
  /** Prompt text shown above the avatar, e.g. "Press ENTER to open". */
  readonly label: string;
};

export type ProximityPromptManager = {
  /**
   * @param avatarX / avatarY — world-space avatar position.
   * @param enterJustDown — pass `Phaser.Input.Keyboard.JustDown(enterKey)`
   *   for the current frame.
   * @returns true only on the frame the callback fired.
   */
  update(avatarX: number, avatarY: number, enterJustDown: boolean): boolean;
  destroy(): void;
};

export function createProximityPromptManager(
  scene: Phaser.Scene,
  trigger: ProximityTrigger,
  onActivate: () => void,
): ProximityPromptManager {
  const container = scene.add.container(0, 0);
  const bg = scene.add.graphics();
  const text = addCrispText(scene, 0, 0, trigger.label, {
    fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
    fontSize: '20px',
    fontStyle: 'bold',
    color: '#fef3c7',
    stroke: '#1c1917',
    strokeThickness: 4,
  }).setOrigin(0.5, 1);
  container.add([bg, text]);
  container.setDepth(2_000_000);
  container.setVisible(false);

  function update(ax: number, ay: number, enterJustDown: boolean): boolean {
    const dx = ax - trigger.centerX;
    const dy = ay - trigger.centerY;
    const inside = Math.hypot(dx, dy) <= trigger.radius;
    if (!inside) {
      container.setVisible(false);
      return false;
    }
    const w = text.width + 28;
    const h = text.height + 14;
    bg.clear();
    bg.fillStyle(0x0b1220, 0.92);
    bg.fillRoundedRect(-w / 2, -h, w, h, 10);
    bg.lineStyle(2, 0xfacc15, 1);
    bg.strokeRoundedRect(-w / 2, -h, w, h, 10);
    text.setPosition(0, -7);
    container.setPosition(ax, ay - 130);
    container.setVisible(true);
    if (enterJustDown) {
      onActivate();
      return true;
    }
    return false;
  }

  return {
    update,
    destroy: () => container.destroy(),
  };
}
