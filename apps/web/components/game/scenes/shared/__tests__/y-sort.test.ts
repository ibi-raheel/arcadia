import { describe, expect, it } from 'vitest';

import { calculateYSortDepth, type YSortable } from '../y-sort';

const CONFIG = { depthBase: 1000, yAnchorRatio: 0.5 } as const;

describe('calculateYSortDepth', () => {
  it('higher Y produces higher depth (lower-on-screen renders in front)', () => {
    const a: YSortable = { y: 100, height: 48 };
    const b: YSortable = { y: 200, height: 48 };
    const c: YSortable = { y: 300, height: 48 };
    expect(calculateYSortDepth(a, CONFIG)).toBeLessThan(calculateYSortDepth(b, CONFIG));
    expect(calculateYSortDepth(b, CONFIG)).toBeLessThan(calculateYSortDepth(c, CONFIG));
  });

  it('includes the anchor offset (y + height * ratio)', () => {
    // y=100, height=48, yAnchorRatio=0.5 → 100 + 24 = 124; + base 1000 = 1124.
    expect(calculateYSortDepth({ y: 100, height: 48 }, CONFIG)).toBe(1124);
  });

  it('taller objects at the same Y sort slightly lower (render in front)', () => {
    const short = { y: 200, height: 32 };
    const tall = { y: 200, height: 64 };
    expect(calculateYSortDepth(short, CONFIG)).toBeLessThan(calculateYSortDepth(tall, CONFIG));
  });

  it('depth base is applied as a constant offset', () => {
    const obj: YSortable = { y: 50, height: 50 };
    const baseA = calculateYSortDepth(obj, { depthBase: 0, yAnchorRatio: 0.5 });
    const baseB = calculateYSortDepth(obj, { depthBase: 5000, yAnchorRatio: 0.5 });
    expect(baseB - baseA).toBe(5000);
  });

  it('yAnchorRatio=0 sorts by top edge; ratio=1 sorts by bottom edge', () => {
    const obj: YSortable = { y: 100, height: 48 };
    expect(calculateYSortDepth(obj, { depthBase: 0, yAnchorRatio: 0 })).toBe(100);
    expect(calculateYSortDepth(obj, { depthBase: 0, yAnchorRatio: 1 })).toBe(148);
  });
});
