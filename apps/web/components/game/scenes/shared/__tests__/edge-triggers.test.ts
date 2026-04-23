import { describe, expect, it } from 'vitest';

import { hitEdge, type EdgeTriggers } from '../edge-triggers';

const WORLD_W = 2508;
const WORLD_H = 2508;

const EDGES: EdgeTriggers = {
  top: { route: '/academy-outside' },
  right: { route: '/tavern-outside' },
  bottom: { route: '/market' },
  left: { route: '/coworking' },
};

describe('hitEdge', () => {
  it('returns null when the avatar is centred', () => {
    expect(hitEdge(1254, 1254, WORLD_W, WORLD_H, EDGES)).toBe(null);
  });

  it('fires the correct edge for each cardinal approach', () => {
    expect(hitEdge(1254, 40, WORLD_W, WORLD_H, EDGES)?.route).toBe('/academy-outside');
    expect(hitEdge(2480, 1254, WORLD_W, WORLD_H, EDGES)?.route).toBe('/tavern-outside');
    expect(hitEdge(1254, 2480, WORLD_W, WORLD_H, EDGES)?.route).toBe('/market');
    expect(hitEdge(40, 1254, WORLD_W, WORLD_H, EDGES)?.route).toBe('/coworking');
  });

  it('respects the default 48px threshold', () => {
    // 49 px in from top edge — not yet firing.
    expect(hitEdge(1254, 49, WORLD_W, WORLD_H, EDGES)).toBe(null);
    // 48 px in — fires.
    expect(hitEdge(1254, 48, WORLD_W, WORLD_H, EDGES)?.route).toBe('/academy-outside');
  });

  it('respects a custom threshold', () => {
    const edges: EdgeTriggers = { top: { route: '/a', threshold: 100 } };
    expect(hitEdge(0, 101, 1000, 1000, edges)).toBe(null);
    expect(hitEdge(0, 100, 1000, 1000, edges)?.route).toBe('/a');
  });

  it('missing edges never fire', () => {
    const onlyTop: EdgeTriggers = { top: { route: '/a' } };
    expect(hitEdge(0, 999, 1000, 1000, onlyTop)).toBe(null);
  });

  it('priority order top > bottom > left > right at corners', () => {
    // top+left corner — top wins per declared order.
    expect(hitEdge(0, 0, 1000, 1000, EDGES)?.route).toBe('/academy-outside');
  });
});
