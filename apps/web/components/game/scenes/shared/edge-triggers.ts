// Walk-onto portals along a scene's outer edges. Unlike EnterPromptManager
// (which requires SPACE), these fire automatically when the avatar crosses
// into an edge band — matching the bridge-portal UX of the prior Tiled world
// (ADR 0007) and the transitions between the square and outdoor neighbour
// scenes.
//
// Design — the manager does not own a physics body. It owns nothing visible
// at all: scenes that want a lamp, sign, or bridge sprite already draw it as
// decor from the image. This helper is just a per-frame distance check.

import type Phaser from 'phaser';

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

export type EdgeTriggerConfig = {
  readonly route: string;
  /** Pixel distance from the edge at which the trigger fires. Default 48. */
  readonly threshold?: number;
};

export type EdgeTriggers = Partial<Record<EdgeSide, EdgeTriggerConfig>>;

export type EdgeTriggerManager = {
  update(avatarX: number, avatarY: number): void;
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

  return {
    update: (ax, ay) => {
      if (fired) return;
      const hitInfo = hitEdgeWithSide(ax, ay, worldWidth, worldHeight, edges);
      if (!hitInfo) return;
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
      /* no persistent objects — nothing to clean up */
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
