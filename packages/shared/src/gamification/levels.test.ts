import { describe, it, expect } from 'vitest';
import { calculateLevel, isValidLevel, MAX_LEVEL, MIN_LEVEL } from './levels';

describe('calculateLevel', () => {
  it('returns 1 at 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 for negative XP', () => {
    expect(calculateLevel(-10)).toBe(1);
  });

  it.each([
    [99, 1],
    [100, 2],
    [299, 2],
    [300, 3],
    [599, 3],
    [600, 4],
    [999, 4],
    [1000, 5],
    [10_000, 5],
  ])('calculateLevel(%d) === %d', (xp, expected) => {
    expect(calculateLevel(xp)).toBe(expected);
  });
});

describe('isValidLevel', () => {
  it.each([MIN_LEVEL, 2, 3, 4, MAX_LEVEL])('accepts %d', (level) => {
    expect(isValidLevel(level)).toBe(true);
  });

  it.each([0, -1, 6, 1.5, NaN, Infinity])('rejects %d', (level) => {
    expect(isValidLevel(level)).toBe(false);
  });
});
