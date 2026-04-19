// Pure dedupe + throttle logic for the WorldScene MOVE loop (Step 6).
// WorldScene holds the Phaser + Colyseus references; this module owns only
// the question "should I send MOVE right now?" so it can be unit tested
// without a Phaser runtime.
//
// Rules:
//   1. If the current move state exactly matches the last-sent state, skip
//      (avoids spamming when the avatar is idle — up to 60 ops/s of zero
//      deltas would otherwise go over the wire).
//   2. If less than `intervalMs` has elapsed since the last send, skip
//      (TAD §4.3 caps MOVE at 20 updates/second → 50 ms interval).
//   3. Otherwise, send.

import type { AvatarDirection } from '@arcadia/shared';

export type MoveState = {
  readonly x: number;
  readonly y: number;
  readonly direction: AvatarDirection;
  readonly isMoving: boolean;
};

export function moveStateEqual(a: MoveState, b: MoveState): boolean {
  return a.x === b.x && a.y === b.y && a.direction === b.direction && a.isMoving === b.isMoving;
}

export function shouldSendMove(
  current: MoveState,
  lastSent: MoveState | null,
  lastSentAt: number,
  now: number,
  intervalMs: number,
): boolean {
  if (lastSent === null) return true; // first send always goes through
  if (moveStateEqual(current, lastSent)) return false;
  if (now - lastSentAt < intervalMs) return false;
  return true;
}
