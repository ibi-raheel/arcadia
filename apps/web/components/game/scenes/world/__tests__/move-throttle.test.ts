import { describe, expect, it } from 'vitest';

import { moveStateEqual, shouldSendMove, type MoveState } from '../move-throttle';

const S = (over: Partial<MoveState> = {}): MoveState => ({
  x: 0,
  y: 0,
  direction: 's',
  isMoving: false,
  ...over,
});

describe('moveStateEqual', () => {
  it('equal across identical states', () => {
    expect(moveStateEqual(S(), S())).toBe(true);
  });

  it('differs on any field change', () => {
    expect(moveStateEqual(S(), S({ x: 1 }))).toBe(false);
    expect(moveStateEqual(S(), S({ y: 1 }))).toBe(false);
    expect(moveStateEqual(S(), S({ direction: 'n' }))).toBe(false);
    expect(moveStateEqual(S(), S({ isMoving: true }))).toBe(false);
  });
});

describe('shouldSendMove', () => {
  const INTERVAL = 50;

  it('first move (no lastSent) always sends', () => {
    expect(shouldSendMove(S(), null, 0, 0, INTERVAL)).toBe(true);
  });

  it('unchanged state never sends, even past the interval', () => {
    const last = S();
    expect(shouldSendMove(S(), last, 0, 100, INTERVAL)).toBe(false);
    expect(shouldSendMove(S(), last, 0, 10_000, INTERVAL)).toBe(false);
  });

  it('changed state blocked by interval', () => {
    const last = S();
    // 49 ms since last send, new position — throttle blocks
    expect(shouldSendMove(S({ x: 10 }), last, 0, 49, INTERVAL)).toBe(false);
    // exactly 50 ms → send
    expect(shouldSendMove(S({ x: 10 }), last, 0, 50, INTERVAL)).toBe(true);
    // past interval → send
    expect(shouldSendMove(S({ x: 10 }), last, 0, 60, INTERVAL)).toBe(true);
  });

  it('isMoving flip forces a send when interval allows', () => {
    const last = S({ isMoving: false });
    expect(shouldSendMove(S({ isMoving: true }), last, 0, 50, INTERVAL)).toBe(true);
  });

  it('direction change forces a send when interval allows', () => {
    const last = S({ direction: 's' });
    expect(shouldSendMove(S({ direction: 'e' }), last, 0, 50, INTERVAL)).toBe(true);
  });

  it('respects non-zero lastSentAt for the interval calc', () => {
    const last = S();
    // lastSentAt=1000, now=1040 → diff 40 < 50 → skip
    expect(shouldSendMove(S({ x: 1 }), last, 1000, 1040, INTERVAL)).toBe(false);
    // lastSentAt=1000, now=1051 → diff 51 → send
    expect(shouldSendMove(S({ x: 1 }), last, 1000, 1051, INTERVAL)).toBe(true);
  });
});
