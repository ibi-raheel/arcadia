import { describe, expect, it } from 'vitest';

import {
  resolveClickTargetVelocity,
  resolveInputDirection,
  resolveInputVelocity,
  velocityToFacingDirection,
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

describe('velocityToFacingDirection', () => {
  it('idle velocity keeps previous facing', () => {
    expect(velocityToFacingDirection(0, 0, 'n')).toBe('n');
    expect(velocityToFacingDirection(0, 0, 'w')).toBe('w');
  });

  it('pure cardinal velocity maps to matching cardinal', () => {
    expect(velocityToFacingDirection(0, -50, 's')).toBe('n'); // screen up → n
    expect(velocityToFacingDirection(0, 50, 'n')).toBe('s'); // screen down → s
    expect(velocityToFacingDirection(50, 0, 'w')).toBe('e'); // screen right → e
    expect(velocityToFacingDirection(-50, 0, 'e')).toBe('w'); // screen left → w
  });

  it('diagonal input picks dominant-axis cardinal', () => {
    // |vx|=60 > |vy|=30 → horizontal wins
    expect(velocityToFacingDirection(60, -30, 'n')).toBe('e');
    expect(velocityToFacingDirection(-60, 30, 's')).toBe('w');
    // |vy|=60 > |vx|=30 → vertical wins
    expect(velocityToFacingDirection(30, -60, 'e')).toBe('n');
    expect(velocityToFacingDirection(-30, 60, 'w')).toBe('s');
  });

  it('perfect diagonals tie — horizontal wins', () => {
    // |vx| === |vy| → horizontal per rule `>=`
    expect(velocityToFacingDirection(50, -50, 'n')).toBe('e');
    expect(velocityToFacingDirection(50, 50, 's')).toBe('e');
    expect(velocityToFacingDirection(-50, -50, 'n')).toBe('w');
    expect(velocityToFacingDirection(-50, 50, 's')).toBe('w');
  });
});
