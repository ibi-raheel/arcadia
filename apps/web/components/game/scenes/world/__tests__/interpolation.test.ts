import { describe, expect, it } from 'vitest';

import { INTERPOLATION_ARRIVED_EPSILON, interpolationStep } from '../interpolation';

const SPEED = 160; // px/s matching sprites.config.avatar.walkSpeed
const SNAP = 128;  // matches remote-avatar REMOTE_SNAP_DISTANCE_PX

describe('interpolationStep', () => {
  it('arrives when within epsilon — no movement, no snap flag', () => {
    const res = interpolationStep({ x: 100, y: 100 }, { x: 100.1, y: 100 }, SPEED, 1 / 60, SNAP);
    expect(res.x).toBe(100.1);
    expect(res.y).toBe(100);
    expect(res.arrived).toBe(true);
    expect(res.snapped).toBe(false);
  });

  it('snaps when target distance exceeds the snap threshold', () => {
    const res = interpolationStep({ x: 0, y: 0 }, { x: 300, y: 0 }, SPEED, 1 / 60, SNAP);
    expect(res.x).toBe(300);
    expect(res.y).toBe(0);
    expect(res.arrived).toBe(true);
    expect(res.snapped).toBe(true);
  });

  it('arrives this frame when step >= remaining distance', () => {
    // 160 px/s * 1 s frame = 160 px step vs 10 px remaining → arrive
    const res = interpolationStep({ x: 0, y: 0 }, { x: 10, y: 0 }, SPEED, 1, SNAP);
    expect(res.x).toBe(10);
    expect(res.y).toBe(0);
    expect(res.arrived).toBe(true);
    expect(res.snapped).toBe(false);
  });

  it('advances fractionally toward target when step < distance', () => {
    // Target 60 px away; step is 160 * (1/60) ≈ 2.667 px
    const res = interpolationStep({ x: 0, y: 0 }, { x: 60, y: 0 }, SPEED, 1 / 60, SNAP);
    expect(res.arrived).toBe(false);
    expect(res.snapped).toBe(false);
    expect(res.x).toBeCloseTo(SPEED / 60, 4);
    expect(res.y).toBe(0);
  });

  it('preserves direction on diagonal moves (scaled by axis proportion)', () => {
    const res = interpolationStep({ x: 0, y: 0 }, { x: 30, y: 40 }, SPEED, 1 / 60, SNAP);
    // Step magnitude ≈ 2.667; dx:dy = 3:4 → x = step * 3/5, y = step * 4/5
    const step = SPEED / 60;
    expect(res.x).toBeCloseTo(step * (3 / 5), 4);
    expect(res.y).toBeCloseTo(step * (4 / 5), 4);
    expect(res.arrived).toBe(false);
  });

  it('arrived epsilon constant is sane (< 1 px)', () => {
    // Pinning so future edits don't make the avatar visibly lag at the target.
    expect(INTERPOLATION_ARRIVED_EPSILON).toBeLessThan(1);
    expect(INTERPOLATION_ARRIVED_EPSILON).toBeGreaterThan(0);
  });
});
