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

export type EntryTrigger = {
  /** Stable identity (tavern-a, tent-3, academy-main, …). Carried in URL. */
  readonly buildingId: string;
  /** World-pixel coordinates of the trigger's centre. */
  readonly centerX: number;
  readonly centerY: number;
  /** Activation radius — the prompt appears inside this distance. */
  readonly radius: number;
  /** Prompt text. Typically "Press SPACE to Enter <name>". */
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
    const d = Math.hypot(dx, dy);
    if (d <= t.radius && d < nearestDist) {
      nearest = t;
      nearestDist = d;
    }
  }
  return nearest;
}

export function createEnterPromptManager(
  scene: Phaser.Scene,
  triggers: readonly EntryTrigger[],
): EnterPromptManager {
  const container = scene.add.container(0, 0);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1);
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
    // Anchor the prompt above the avatar's head so it's visible even when
    // the trigger radius is large (e.g. academy's 1200px premises zone).
    // Previously positioned at the trigger center + offset, which pushed
    // the prompt off-screen for big radii.
    container.setPosition(ax, ay - 90);
    container.setVisible(true);

    if (enterJustDown) {
      navigating = true;
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
