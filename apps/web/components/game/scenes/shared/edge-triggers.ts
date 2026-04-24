// Walk-onto portals along a scene's outer edges. Two modes:
//
//   1. INSTANT (default) — when the avatar crosses into the edge band, the
//      camera fades and the next route loads. Used for outdoor → square
//      return edges where the member is deliberately walking back.
//   2. ENTER-PROMPT — when the avatar enters the edge band, a pill appears
//      reading `promptLabel`. Navigation only happens on ENTER keydown.
//      Used on the square's four cardinal exits (Phase 7 item G2) so the
//      member gets a beat to decide before being whisked to the next zone.
//
// The pill is rendered inline to keep the helper self-contained; it mirrors
// the style used in `enter-prompt.ts`.

import type Phaser from 'phaser';

import { addCrispText } from './crisp-text';

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

export type EdgeTriggerConfig = {
  readonly route: string;
  /** Pixel distance from the edge at which the trigger fires. Default 48. */
  readonly threshold?: number;
  /**
   * If set, the edge becomes ENTER-gated: walking into the band shows a
   * prompt pill with this label; only ENTER navigates. Omit for instant
   * walk-onto behaviour.
   */
  readonly promptLabel?: string;
};

export type EdgeTriggers = Partial<Record<EdgeSide, EdgeTriggerConfig>>;

export type EdgeTriggerManager = {
  /**
   * Call once per frame. `enterJustDown` is consulted only when the active
   * edge uses `promptLabel`; for instant edges the third argument is ignored.
   */
  update(avatarX: number, avatarY: number, enterJustDown?: boolean): void;
  destroy(): void;
};

/**
 * Called synchronously as the trigger fires (before the fade starts).
 * Scenes use this to send Colyseus LEAVE_BUILDING etc.
 */
export type EdgeTriggerFiredCallback = (side: EdgeSide, route: string) => void;

/**
 * Pure edge-detection — unit-testable without Phaser.
 *
 * Returns the first matching edge config or null. Priority order is
 * top → bottom → left → right; scenes that want to block transitions at
 * corners can rely on the predictable order.
 */
export function hitEdge(
  avatarX: number,
  avatarY: number,
  worldWidth: number,
  worldHeight: number,
  edges: EdgeTriggers,
): EdgeTriggerConfig | null {
  if (edges.top && avatarY <= (edges.top.threshold ?? 48)) return edges.top;
  if (edges.bottom && avatarY >= worldHeight - (edges.bottom.threshold ?? 48)) {
    return edges.bottom;
  }
  if (edges.left && avatarX <= (edges.left.threshold ?? 48)) return edges.left;
  if (edges.right && avatarX >= worldWidth - (edges.right.threshold ?? 48)) {
    return edges.right;
  }
  return null;
}

export function createEdgeTriggerManager(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  edges: EdgeTriggers,
  onFire?: EdgeTriggerFiredCallback,
): EdgeTriggerManager {
  let fired = false;

  // Pill is created lazily — scenes that use only instant edges never
  // allocate the Container / Graphics / Text at all.
  let pill: { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text } | null = null;
  const ensurePill = (): typeof pill => {
    if (pill) return pill;
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
    container.setDepth(2_000_000).setVisible(false).setScrollFactor(1);
    pill = { container, bg, text };
    return pill;
  };
  const showPill = (label: string, ax: number, ay: number): void => {
    const p = ensurePill()!;
    p.text.setText(label);
    const w = p.text.width + 28;
    const h = p.text.height + 14;
    p.bg.clear();
    p.bg.fillStyle(0x0b1220, 0.92);
    p.bg.fillRoundedRect(-w / 2, -h, w, h, 10);
    p.bg.lineStyle(2, 0xfacc15, 1);
    p.bg.strokeRoundedRect(-w / 2, -h, w, h, 10);
    p.text.setPosition(0, -7);
    p.container.setPosition(ax, ay - 130);
    p.container.setVisible(true);
  };
  const hidePill = (): void => {
    if (pill) pill.container.setVisible(false);
  };

  return {
    update: (ax, ay, enterJustDown = false) => {
      if (fired) return;
      const hitInfo = hitEdgeWithSide(ax, ay, worldWidth, worldHeight, edges);
      if (!hitInfo) {
        hidePill();
        return;
      }
      if (hitInfo.cfg.promptLabel) {
        showPill(hitInfo.cfg.promptLabel, ax, ay);
        if (!enterJustDown) return;
      }
      fired = true;
      if (onFire) {
        try {
          onFire(hitInfo.side, hitInfo.cfg.route);
        } catch (err) {
          console.error('edge-trigger onFire callback threw:', err);
        }
      }
      scene.cameras.main.fadeOut(300, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        if (typeof window !== 'undefined') window.location.href = hitInfo.cfg.route;
      });
    },
    destroy: () => {
      if (pill) {
        pill.container.destroy();
        pill = null;
      }
    },
  };
}

/**
 * Same as hitEdge but also returns which side fired. Kept separate so the
 * pure `hitEdge` return shape stays minimal for external callers.
 */
function hitEdgeWithSide(
  avatarX: number,
  avatarY: number,
  worldWidth: number,
  worldHeight: number,
  edges: EdgeTriggers,
): { readonly side: EdgeSide; readonly cfg: EdgeTriggerConfig } | null {
  if (edges.top && avatarY <= (edges.top.threshold ?? 48)) {
    return { side: 'top', cfg: edges.top };
  }
  if (edges.bottom && avatarY >= worldHeight - (edges.bottom.threshold ?? 48)) {
    return { side: 'bottom', cfg: edges.bottom };
  }
  if (edges.left && avatarX <= (edges.left.threshold ?? 48)) {
    return { side: 'left', cfg: edges.left };
  }
  if (edges.right && avatarX >= worldWidth - (edges.right.threshold ?? 48)) {
    return { side: 'right', cfg: edges.right };
  }
  return null;
}
