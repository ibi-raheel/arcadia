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
  // Scriptorium pill — same treatment as enter-prompt so every in-scene
  // prompt reads as one UI language (IM Fell English italic + night-on-
  // bronze frame, not the earlier Georgia-bold yellow-on-blue).
  const text = addCrispText(scene, 0, 0, trigger.label, {
    fontFamily: '"IM Fell English", "EB Garamond", Georgia, serif',
    fontSize: '20px',
    fontStyle: 'italic',
    color: '#e8d5a5',
    stroke: '#0a0a0a',
    strokeThickness: 3,
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
    const w = text.width + 34;
    const h = text.height + 18;
    bg.clear();
    bg.fillStyle(0x0e0806, 0.95);
    bg.fillRoundedRect(-w / 2, -h, w, h, 4);
    bg.lineStyle(1.5, 0x8e6e28, 1);
    bg.strokeRoundedRect(-w / 2, -h, w, h, 4);
    bg.lineStyle(1, 0xd4a868, 0.55);
    bg.strokeRoundedRect(-w / 2 + 2, -h + 2, w - 4, h - 4, 3);
    text.setPosition(0, -9);
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
