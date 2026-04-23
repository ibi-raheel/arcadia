import { describe, expect, it } from 'vitest';

import {
  findNearestActiveTrigger,
  type EntryTrigger,
} from '../enter-prompt';

const TRIGGERS: readonly EntryTrigger[] = [
  { buildingId: 'a', centerX: 100, centerY: 100, radius: 50, label: 'A', route: '/a' },
  { buildingId: 'b', centerX: 500, centerY: 500, radius: 50, label: 'B', route: '/b' },
];

describe('findNearestActiveTrigger', () => {
  it('returns null when avatar is outside every radius', () => {
    expect(findNearestActiveTrigger(0, 0, TRIGGERS)).toBe(null);
    expect(findNearestActiveTrigger(300, 300, TRIGGERS)).toBe(null);
  });

  it('returns the single trigger whose radius contains the avatar', () => {
    expect(findNearestActiveTrigger(110, 110, TRIGGERS)?.buildingId).toBe('a');
    expect(findNearestActiveTrigger(480, 480, TRIGGERS)?.buildingId).toBe('b');
  });

  it('picks the nearest when two triggers both contain the avatar', () => {
    const overlapping: EntryTrigger[] = [
      { buildingId: 'a', centerX: 100, centerY: 0, radius: 150, label: 'A', route: '/a' },
      { buildingId: 'b', centerX: 200, centerY: 0, radius: 150, label: 'B', route: '/b' },
    ];
    expect(findNearestActiveTrigger(110, 0, overlapping)?.buildingId).toBe('a');
    expect(findNearestActiveTrigger(190, 0, overlapping)?.buildingId).toBe('b');
  });

  it('respects the radius boundary exactly', () => {
    // Distance = 50 (radius). Inclusive per implementation.
    expect(findNearestActiveTrigger(150, 100, TRIGGERS)?.buildingId).toBe('a');
    // Distance = 51. Outside.
    expect(findNearestActiveTrigger(151, 100, TRIGGERS)).toBe(null);
  });
});
