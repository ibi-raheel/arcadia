import { describe, expect, it } from 'vitest';

import {
  resolveClickTargetVelocity,
  resolveInputDirection,
  resolveInputVelocity,
  velocityToIsoDirection,
  type InputState,
} from '../input';

const NONE: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

describe('resolveInputVelocity', () => {
  it('no input → zero velocity, not moving', () => {
    expect(resolveInputVelocity(NONE, 100)).toEqual({
      vx: 0,
      vy: 0,
      isMoving: false,
    });
  });

  it('single cardinal: matches speed exactly', () => {
    expect(resolveInputVelocity({ ...NONE, right: true }, 100)).toEqual({
      vx: 100,
      vy: 0,
      isMoving: true,
    });
    expect(resolveInputVelocity({ ...NONE, up: true }, 100)).toEqual({
      vx: 0,
      vy: -100,
      isMoving: true,
    });
  });

  it('diagonal is normalised — total speed stays at `speed`', () => {
    const res = resolveInputVelocity({ ...NONE, right: true, down: true }, 100);
    expect(res.isMoving).toBe(true);
    expect(Math.hypot(res.vx, res.vy)).toBeCloseTo(100, 5);
    expect(res.vx).toBeCloseTo(100 / Math.SQRT2, 5);
    expect(res.vy).toBeCloseTo(100 / Math.SQRT2, 5);
  });

  it('opposing keys cancel to zero', () => {
    expect(resolveInputVelocity({ ...NONE, left: true, right: true }, 100)).toEqual({
      vx: 0,
      vy: 0,
      isMoving: false,
    });
    expect(resolveInputVelocity({ ...NONE, up: true, down: true }, 100)).toEqual({
      vx: 0,
      vy: 0,
      isMoving: false,
    });
  });

  it('all-four keys cancel', () => {
    expect(resolveInputVelocity({ up: true, down: true, left: true, right: true }, 100)).toEqual({
      vx: 0,
      vy: 0,
      isMoving: false,
    });
  });

  it('Step 16 zero-delay state machine — isMoving flips same frame as input change', () => {
    // Simulates three consecutive frames. Per the plan (user decision
    // 2026-04-18), there is no 2s delay: the instant input appears or
    // disappears, isMoving must flip.
    const idle = resolveInputVelocity(NONE, 160);
    const walking = resolveInputVelocity({ ...NONE, right: true }, 160);
    const stopped = resolveInputVelocity(NONE, 160);
    expect(idle.isMoving).toBe(false);
    expect(walking.isMoving).toBe(true);
    expect(stopped.isMoving).toBe(false);
  });
});

describe('resolveInputDirection', () => {
  it('no input keeps previous direction', () => {
    expect(resolveInputDirection(NONE, 'up')).toBe('up');
    expect(resolveInputDirection(NONE, 'down')).toBe('down');
  });

  it('horizontal wins over vertical on diagonal input', () => {
    expect(resolveInputDirection({ ...NONE, up: true, left: true }, 'down')).toBe('left');
    expect(resolveInputDirection({ ...NONE, down: true, right: true }, 'up')).toBe('right');
  });

  it('single key picks its own direction regardless of prev', () => {
    expect(resolveInputDirection({ ...NONE, up: true }, 'down')).toBe('up');
    expect(resolveInputDirection({ ...NONE, left: true }, 'right')).toBe('left');
  });
});

describe('resolveClickTargetVelocity', () => {
  it('within threshold → arrived, zero velocity, direction preserved', () => {
    const res = resolveClickTargetVelocity({ x: 100, y: 100 }, { x: 101, y: 100 }, 160, 2, 'down');
    expect(res).toEqual({ vx: 0, vy: 0, arrived: true, direction: 'down' });
  });

  it('cardinal east target produces pure-x velocity + right direction', () => {
    const res = resolveClickTargetVelocity({ x: 0, y: 0 }, { x: 100, y: 0 }, 160, 2, 'up');
    expect(res.vx).toBeCloseTo(160);
    expect(res.vy).toBeCloseTo(0);
    expect(res.arrived).toBe(false);
    expect(res.direction).toBe('right');
  });

  it('diagonal target — speed magnitude stays at speed', () => {
    const res = resolveClickTargetVelocity({ x: 0, y: 0 }, { x: 100, y: 100 }, 160, 2, 'up');
    expect(Math.hypot(res.vx, res.vy)).toBeCloseTo(160, 4);
    // |dx| === |dy| so horizontal ties win via >=
    expect(res.direction).toBe('right');
  });

  it('dominant-vertical delta picks up/down', () => {
    const south = resolveClickTargetVelocity({ x: 0, y: 0 }, { x: 10, y: 100 }, 160, 2, 'left');
    expect(south.direction).toBe('down');

    const north = resolveClickTargetVelocity({ x: 0, y: 100 }, { x: 10, y: 0 }, 160, 2, 'right');
    expect(north.direction).toBe('up');
  });
});

describe('velocityToIsoDirection', () => {
  it('idle velocity keeps previous facing', () => {
    expect(velocityToIsoDirection(0, 0, 'ne')).toBe('ne');
    expect(velocityToIsoDirection(0, 0, 'sw')).toBe('sw');
  });

  it('each velocity quadrant maps to one iso corner', () => {
    // vx≥0, vy<0 → ne (screen up-right)
    expect(velocityToIsoDirection(50, -50, 'se')).toBe('ne');
    expect(velocityToIsoDirection(50, -0.1, 'se')).toBe('ne');
    // vx≥0, vy≥0 → se
    expect(velocityToIsoDirection(50, 50, 'ne')).toBe('se');
    expect(velocityToIsoDirection(0, 50, 'ne')).toBe('se');
    // vx<0, vy≥0 → sw
    expect(velocityToIsoDirection(-50, 50, 'ne')).toBe('sw');
    expect(velocityToIsoDirection(-50, 0, 'ne')).toBe('sw');
    // vx<0, vy<0 → nw
    expect(velocityToIsoDirection(-50, -50, 'ne')).toBe('nw');
  });

  it('pure cardinal velocity picks a canonical iso direction', () => {
    // Screen up (vy<0 only) → ne (upper-right iso corner by convention)
    expect(velocityToIsoDirection(0, -50, 'se')).toBe('ne');
    // Screen right (vx>0 only) → se
    expect(velocityToIsoDirection(50, 0, 'nw')).toBe('se');
  });
});
