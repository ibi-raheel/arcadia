// Pure input-state math for WorldScene keyboard movement (Step 13).
// WorldScene's update() reads the WASD + arrow-key state into an
// InputState struct, then calls these functions to compute velocity +
// facing direction. Phaser is not imported here so the math is unit-testable.

import type { Direction, IsoDirection } from '../shared/types';

export type InputState = {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
};

export type VelocityResult = {
  readonly vx: number;
  readonly vy: number;
  readonly isMoving: boolean;
};

/**
 * Maps key state to a velocity vector capped at `speed` pixels/second.
 * Opposing keys cancel (left + right → 0). Diagonals are normalised so
 * `↑+→` isn't √2× faster than `→` alone.
 */
export function resolveInputVelocity(input: InputState, speed: number): VelocityResult {
  let vx = 0;
  let vy = 0;
  if (input.left) vx -= 1;
  if (input.right) vx += 1;
  if (input.up) vy -= 1;
  if (input.down) vy += 1;

  if (vx === 0 && vy === 0) {
    return { vx: 0, vy: 0, isMoving: false };
  }

  const len = Math.hypot(vx, vy);
  return {
    vx: (vx / len) * speed,
    vy: (vy / len) * speed,
    isMoving: true,
  };
}

/**
 * Picks the facing direction from input, preferring horizontal over vertical
 * on simultaneous diagonal input. Returns `prev` when no input is active
 * so the avatar keeps facing where it last walked.
 */
export function resolveInputDirection(input: InputState, prev: Direction): Direction {
  if (input.left) return 'left';
  if (input.right) return 'right';
  if (input.up) return 'up';
  if (input.down) return 'down';
  return prev;
}

export type ClickTargetResult = {
  readonly vx: number;
  readonly vy: number;
  readonly arrived: boolean;
  readonly direction: Direction;
};

/**
 * Velocity toward a world-space target point, capped at `speed`.
 * Reports `arrived: true` when the avatar is within `threshold` px — the
 * scene clears the target + zeroes the body on arrival.
 *
 * Uses the `dx`/`dy` dominant axis to pick a facing direction so the
 * avatar visually "points" where it's walking (matters once real
 * directional sprites land).
 */
export function resolveClickTargetVelocity(
  from: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  speed: number,
  threshold: number,
  prevDirection: Direction,
): ClickTargetResult {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= threshold) {
    return { vx: 0, vy: 0, arrived: true, direction: prevDirection };
  }
  const direction = inferDirectionFromDelta(dx, dy, prevDirection);
  return {
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    arrived: false,
    direction,
  };
}

function inferDirectionFromDelta(dx: number, dy: number, prev: Direction): Direction {
  if (dx === 0 && dy === 0) return prev;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Maps a screen-space velocity vector to the iso facing direction the avatar
 * sprite should show. 2:1 iso has 4 facing directions (ne/se/sw/nw), one per
 * velocity-sign quadrant. Idle velocity (0, 0) preserves `prev` so the avatar
 * keeps facing where it last walked.
 */
export function velocityToIsoDirection(
  vx: number,
  vy: number,
  prev: IsoDirection,
): IsoDirection {
  if (vx === 0 && vy === 0) return prev;
  if (vx >= 0 && vy < 0) return 'ne';
  if (vx >= 0 && vy >= 0) return 'se';
  if (vx < 0 && vy >= 0) return 'sw';
  return 'nw';
}
