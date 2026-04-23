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
): EdgeTriggerManager {
  let fired = false;

  return {
    update: (ax, ay) => {
      if (fired) return;
      const hit = hitEdge(ax, ay, worldWidth, worldHeight, edges);
      if (!hit) return;
      fired = true;
      scene.cameras.main.fadeOut(300, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        if (typeof window !== 'undefined') window.location.href = hit.route;
      });
    },
    destroy: () => {
      /* no persistent objects — nothing to clean up */
    },
  };
}
