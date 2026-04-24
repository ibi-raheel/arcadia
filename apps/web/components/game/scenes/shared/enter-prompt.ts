// Proximity-based "Press ENTER to visit X" prompts used by the outdoor scenes
// (academy-outside, tavern-outside, coworking-outside). Each scene declares a
// list of EntryTriggers; the manager tracks which (if any) is closest to the
// avatar, renders a floating pill above it, and — when ENTER is pressed while
// a trigger is active — fades the camera and navigates to the trigger's route.
//
// 2026-04-22 — switched from SPACE to ENTER so jump (SPACE) works unhindered
// inside a prompt radius. Caller passes `enterJustDown` from
// Phaser.Input.Keyboard.JustDown(enterKey).
//
// Shared across scenes per `scenes/shared/CLAUDE.md` — the prompt shape is
// identical for every outdoor scene, so the helper lives here, not per-scene.

import type Phaser from 'phaser';

import { addCrispText } from './crisp-text';

export type EntryTrigger = {
  /** Stable identity (tavern-a, tent-3, academy-main, …). Carried in URL. */
  readonly buildingId: string;
  /** World-pixel coordinates of the trigger's centre. */
  readonly centerX: number;
  readonly centerY: number;
  /** Circular activation radius — used when halfWidth/halfHeight are absent. */
  readonly radius: number;
  /**
   * Rectangular zone half-extents (overrides `radius` when set). Trigger
   * fires when the avatar is within `[centerX - halfWidth, centerX + halfWidth]`
   * and `[centerY - halfHeight, centerY + halfHeight]`. Use when a door or
   * bridge is better represented by an axis-aligned box than a circle.
   */
  readonly halfWidth?: number;
  readonly halfHeight?: number;
  /** Prompt text. Typically "Press ENTER to visit <name>". */
  readonly label: string;
  /** Destination route. The `buildingId` should already be baked in as `?b=`. */
  readonly route: string;
};

export type EnterPromptUpdateResult = {
  /** True while at least one trigger is within its activation radius. */
  readonly active: boolean;
  /** True only on the frame navigation was kicked off. */
  readonly navigated: boolean;
};

export type EnterPromptManager = {
  update(avatarX: number, avatarY: number, enterJustDown: boolean): EnterPromptUpdateResult;
  destroy(): void;
};

/**
 * Fired synchronously the instant ENTER is pressed inside a trigger's
 * radius, BEFORE the camera fade begins. Scenes that need to send a
 * Colyseus LEAVE_BUILDING (or similar pre-navigate signal) use this —
 * firing after the fade would race the room leave.
 */
export type EnterPromptFiredCallback = (trigger: EntryTrigger) => void;

/**
 * Find the nearest trigger whose circle contains the avatar. Pure — lifted
 * out so it's unit-testable without Phaser.
 */
export function findNearestActiveTrigger(
  avatarX: number,
  avatarY: number,
  triggers: readonly EntryTrigger[],
): EntryTrigger | null {
  let nearest: EntryTrigger | null = null;
  let nearestDist = Infinity;
  for (const t of triggers) {
    const dx = avatarX - t.centerX;
    const dy = avatarY - t.centerY;
    const inside =
      t.halfWidth !== undefined && t.halfHeight !== undefined
        ? Math.abs(dx) <= t.halfWidth && Math.abs(dy) <= t.halfHeight
        : Math.hypot(dx, dy) <= t.radius;
    if (!inside) continue;
    // Euclidean distance is a reasonable tiebreaker regardless of zone shape.
    const d = Math.hypot(dx, dy);
    if (d < nearestDist) {
      nearest = t;
      nearestDist = d;
    }
  }
  return nearest;
}

export function createEnterPromptManager(
  scene: Phaser.Scene,
  triggers: readonly EntryTrigger[],
  onFire?: EnterPromptFiredCallback,
): EnterPromptManager {
  const container = scene.add.container(0, 0);
  const bg = scene.add.graphics();
  const text = addCrispText(scene, 0, 0, '', {
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

  let navigating = false;

  function update(ax: number, ay: number, enterJustDown: boolean): EnterPromptUpdateResult {
    if (navigating) {
      return { active: true, navigated: false };
    }

    const nearest = findNearestActiveTrigger(ax, ay, triggers);
    if (!nearest) {
      container.setVisible(false);
      return { active: false, navigated: false };
    }

    text.setText(nearest.label);
    const w = text.width + 28;
    const h = text.height + 14;
    bg.clear();
    bg.fillStyle(0x0b1220, 0.92);
    bg.fillRoundedRect(-w / 2, -h, w, h, 10);
    bg.lineStyle(2, 0xfacc15, 1);
    bg.strokeRoundedRect(-w / 2, -h, w, h, 10);
    text.setPosition(0, -7);
    // Anchor the prompt above the avatar's head so it clears the name tag
    // (name tag anchored at avatar-top minus 6px, extending ~24px upward).
    // 2026-04-23: raised from -90 → -130 to stop the prompt bg clipping the
    // nameplate on 135px outdoor avatars (Phase 7 item AC2).
    container.setPosition(ax, ay - 130);
    container.setVisible(true);

    if (enterJustDown) {
      navigating = true;
      if (onFire) {
        try {
          onFire(nearest);
        } catch (err) {
          console.error('enter-prompt onFire callback threw:', err);
        }
      }
      scene.cameras.main.fadeOut(300, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        if (typeof window !== 'undefined') window.location.href = nearest.route;
      });
      return { active: true, navigated: true };
    }

    return { active: true, navigated: false };
  }

  return {
    update,
    destroy: () => {
      container.destroy();
    },
  };
}
