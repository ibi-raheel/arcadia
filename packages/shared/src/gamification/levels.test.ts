import { describe, it, expect } from 'vitest';
import { calculateLevel, isValidLevel, MAX_LEVEL, MIN_LEVEL, progressToNextLevel } from './levels';

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

describe('progressToNextLevel', () => {
  it('returns level 1, 0% at 0 XP', () => {
    const r = progressToNextLevel(0);
    expect(r.level).toBe(1);
    expect(r.currentLevelXp).toBe(0);
    expect(r.nextLevelXp).toBe(100);
    expect(r.percent).toBe(0);
  });

  it('clamps negative XP to level 1, 0%', () => {
    const r = progressToNextLevel(-50);
    expect(r.level).toBe(1);
    expect(r.percent).toBe(0);
  });

  it('halfway between L1 and L2 → ~0.5', () => {
    const r = progressToNextLevel(50);
    expect(r.level).toBe(1);
    expect(r.percent).toBeCloseTo(0.5, 5);
  });

  it('exactly on a threshold → percent 0 of the new level', () => {
    const r = progressToNextLevel(100);
    expect(r.level).toBe(2);
    expect(r.currentLevelXp).toBe(100);
    expect(r.nextLevelXp).toBe(300);
    expect(r.percent).toBe(0);
  });

  it('mid-way between L3 and L4 (450 XP, span 300, into 150) → 0.5', () => {
    const r = progressToNextLevel(450);
    expect(r.level).toBe(3);
    expect(r.percent).toBeCloseTo(0.5, 5);
  });

  it('at MAX_LEVEL: percent always 1, nextLevelXp null', () => {
    const r = progressToNextLevel(1000);
    expect(r.level).toBe(MAX_LEVEL);
    expect(r.nextLevelXp).toBeNull();
    expect(r.percent).toBe(1);
  });

  it('above MAX_LEVEL stays at MAX with percent 1', () => {
    const r = progressToNextLevel(99_999);
    expect(r.level).toBe(MAX_LEVEL);
    expect(r.percent).toBe(1);
    expect(r.nextLevelXp).toBeNull();
  });
});
