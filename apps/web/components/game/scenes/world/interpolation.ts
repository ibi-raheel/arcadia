// Pure linear-interpolation step for remote-avatar positions. WorldScene
// calls this each frame with the last server-reported target and the
// currently-displayed render position; it returns the new render position
// after advancing one frame.
//
// Rules:
//   - If target ≈ current (< arrivedEpsilon), snap to target and report done.
//   - If |target - current| > snapThresholdPx, snap (teleport / reconnect).
//   - Otherwise, advance toward target at `speedPxPerSec * dtSec`.

export const INTERPOLATION_ARRIVED_EPSILON = 0.5;

export type Point = { readonly x: number; readonly y: number };

export type InterpStepResult = {
  readonly x: number;
  readonly y: number;
  readonly arrived: boolean;
  readonly snapped: boolean;
};

export function interpolationStep(
  current: Point,
  target: Point,
  speedPxPerSec: number,
  dtSec: number,
  snapThresholdPx: number,
): InterpStepResult {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= INTERPOLATION_ARRIVED_EPSILON) {
    return { x: target.x, y: target.y, arrived: true, snapped: false };
  }

  if (dist > snapThresholdPx) {
    return { x: target.x, y: target.y, arrived: true, snapped: true };
  }

  const step = speedPxPerSec * dtSec;
  if (step >= dist) {
    return { x: target.x, y: target.y, arrived: true, snapped: false };
  }

  const scale = step / dist;
  return {
    x: current.x + dx * scale,
    y: current.y + dy * scale,
    arrived: false,
    snapped: false,
  };
}
