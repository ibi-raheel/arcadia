import { describe, expect, it } from 'vitest';

import {
  BADGE_ROOM_BY_BUILDING,
  formatBadgeText,
  httpEndpointFor,
  POLL_INTERVAL_MS,
} from '../member-count-badge';

describe('formatBadgeText', () => {
  it('renders null as the em-dash placeholder', () => {
    expect(formatBadgeText(null)).toBe('—');
  });
  it('renders 0 as "0"', () => {
    expect(formatBadgeText(0)).toBe('0');
  });
  it('renders positive counts as their decimal form', () => {
    expect(formatBadgeText(1)).toBe('1');
    expect(formatBadgeText(20)).toBe('20');
    expect(formatBadgeText(999)).toBe('999');
  });
});

describe('httpEndpointFor', () => {
  it('converts wss → https', () => {
    expect(httpEndpointFor('wss://foo.example.com')).toBe('https://foo.example.com');
  });
  it('converts ws → http (dev)', () => {
    expect(httpEndpointFor('ws://localhost:2567')).toBe('http://localhost:2567');
  });
  it('leaves non-prefixed strings untouched (caller bug, not silent-fix)', () => {
    expect(httpEndpointFor('https://already.http')).toBe('https://already.http');
  });
});

describe('BADGE_ROOM_BY_BUILDING', () => {
  it('maps tavern to its Colyseus room; academy / market to null', () => {
    // Only Tavern has multiplayer in Phase 2 (TAD §4.2 keeps Academy +
    // Market React-only forever). Null → badge renders "0" statically.
    expect(BADGE_ROOM_BY_BUILDING.tavern).toBe('tavern-realm1');
    expect(BADGE_ROOM_BY_BUILDING.academy).toBeNull();
    expect(BADGE_ROOM_BY_BUILDING.market).toBeNull();
  });
});

describe('POLL_INTERVAL_MS', () => {
  it('is 3000 ms per plan (3 s poll cadence)', () => {
    expect(POLL_INTERVAL_MS).toBe(3000);
  });
});
