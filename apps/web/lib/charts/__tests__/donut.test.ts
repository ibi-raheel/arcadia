import { describe, expect, it } from 'vitest';

import { buildDonut } from '../donut';

describe('buildDonut', () => {
  it('returns a slice per input segment', () => {
    const g = buildDonut(
      [
        { share: 1, color: 'red' },
        { share: 2, color: 'blue' },
        { share: 3, color: 'green' },
      ],
      { size: 160, thickness: 20 },
    );
    expect(g.slices).toHaveLength(3);
  });

  it('normalises shares to circumference (sum of lengths ≈ circumference)', () => {
    const segs = [
      { share: 30, color: 'a' },
      { share: 50, color: 'b' },
      { share: 20, color: 'c' },
    ];
    const g = buildDonut(segs, { size: 160, thickness: 20 });
    const sum = g.slices.reduce((a, s) => a + s.length, 0);
    expect(sum).toBeCloseTo(g.circumference, 3);
  });

  it('offsets each slice by the cumulative start of the previous ones', () => {
    const g = buildDonut(
      [
        { share: 25, color: 'a' },
        { share: 75, color: 'b' },
      ],
      { size: 200, thickness: 20 },
    );
    expect(g.slices[0]!.offset).toBe(0);
    // Second slice starts where the first ends.
    expect(g.slices[1]!.offset).toBeCloseTo(g.slices[0]!.length, 3);
  });

  it('insets the radius by thickness/2 + 2', () => {
    const g = buildDonut([{ share: 1, color: 'a' }], { size: 160, thickness: 20 });
    expect(g.r).toBe(160 / 2 - 20 / 2 - 2);
    expect(g.cx).toBe(80);
  });

  it('handles empty input gracefully (no crash, no NaN)', () => {
    const g = buildDonut([], { size: 100, thickness: 10 });
    expect(g.slices).toHaveLength(0);
    expect(Number.isFinite(g.circumference)).toBe(true);
  });

  it('handles all-zero shares without dividing by zero', () => {
    const g = buildDonut(
      [
        { share: 0, color: 'a' },
        { share: 0, color: 'b' },
      ],
      { size: 100, thickness: 10 },
    );
    for (const slice of g.slices) {
      expect(slice.length).toBe(0);
      expect(slice.offset).toBe(0);
    }
  });

  it('preserves label pass-through', () => {
    const g = buildDonut([{ share: 1, color: 'red', label: 'courses' }], {
      size: 100,
      thickness: 10,
    });
    expect(g.slices[0]!.label).toBe('courses');
  });
});
