import { describe, expect, it } from 'vitest';

import type { LiveEvent } from '@/lib/fixtures/events';

import { eventStatus, formatEventWhen, liveEvent, nextEvent, relativeTime } from '../status';

const makeEvent = (startsAt: string, endsAt: string): LiveEvent => ({
  id: 'e',
  creatorId: 'c',
  creatorName: 'c',
  title: 't',
  description: null,
  startsAt,
  endsAt,
  streamUrl: null,
  location: 'tavern-a',
});

describe('eventStatus', () => {
  it('classifies upcoming when now < startsAt', () => {
    const e = makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z');
    const now = new Date('2026-04-30T10:00:00Z');
    expect(eventStatus(e, now)).toBe('upcoming');
  });

  it('classifies live when startsAt ≤ now ≤ endsAt', () => {
    const e = makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z');
    const now = new Date('2026-05-01T10:30:00Z');
    expect(eventStatus(e, now)).toBe('live');
  });

  it('classifies past when now > endsAt', () => {
    const e = makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z');
    const now = new Date('2026-05-01T11:30:00Z');
    expect(eventStatus(e, now)).toBe('past');
  });
});

describe('nextEvent', () => {
  it('returns the earliest future event', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const events: readonly LiveEvent[] = [
      makeEvent('2026-05-05T10:00:00Z', '2026-05-05T11:00:00Z'),
      makeEvent('2026-05-02T10:00:00Z', '2026-05-02T11:00:00Z'),
      makeEvent('2026-04-28T10:00:00Z', '2026-04-28T11:00:00Z'), // past
    ];
    expect(nextEvent(events, now)!.startsAt).toBe('2026-05-02T10:00:00Z');
  });

  it('returns a currently-live event rather than skipping ahead', () => {
    const now = new Date('2026-05-01T10:30:00Z');
    const events: readonly LiveEvent[] = [
      makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z'),
      makeEvent('2026-05-03T10:00:00Z', '2026-05-03T11:00:00Z'),
    ];
    expect(nextEvent(events, now)!.startsAt).toBe('2026-05-01T10:00:00Z');
  });

  it('returns null when every event is past', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const events: readonly LiveEvent[] = [
      makeEvent('2026-04-28T10:00:00Z', '2026-04-28T11:00:00Z'),
    ];
    expect(nextEvent(events, now)).toBeNull();
  });
});

describe('liveEvent', () => {
  it('picks the event currently running', () => {
    const now = new Date('2026-05-01T10:30:00Z');
    const events: readonly LiveEvent[] = [
      makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z'),
      makeEvent('2026-05-02T10:00:00Z', '2026-05-02T11:00:00Z'),
    ];
    expect(liveEvent(events, now)!.id).toBe('e');
  });

  it('returns null when nothing is live', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const events: readonly LiveEvent[] = [
      makeEvent('2026-05-01T10:00:00Z', '2026-05-01T11:00:00Z'),
    ];
    expect(liveEvent(events, now)).toBeNull();
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-05-01T12:00:00Z');

  it('reads "just now" within a minute', () => {
    expect(relativeTime('2026-05-01T11:59:31Z', now)).toBe('just now');
  });

  it('reads minutes for < 60m', () => {
    expect(relativeTime('2026-05-01T11:30:00Z', now)).toBe('30m ago');
  });

  it('reads hours for 1–23h', () => {
    expect(relativeTime('2026-05-01T06:00:00Z', now)).toBe('6h ago');
  });

  it('reads yesterday for 1 day in the past', () => {
    expect(relativeTime('2026-04-30T12:00:00Z', now)).toBe('yesterday');
  });

  it('reads tomorrow for 1 day in the future', () => {
    expect(relativeTime('2026-05-02T12:00:00Z', now)).toBe('tomorrow');
  });

  it('reads days for under a week', () => {
    expect(relativeTime('2026-04-28T12:00:00Z', now)).toBe('3d ago');
  });

  it('reads weeks for under a month', () => {
    expect(relativeTime('2026-04-17T12:00:00Z', now)).toBe('2w ago');
  });
});

describe('formatEventWhen', () => {
  it('reads "today · HH:MM" for same-day events', () => {
    const now = new Date('2026-05-01T08:00:00Z');
    const e = makeEvent('2026-05-01T19:00:00Z', '2026-05-01T20:00:00Z');
    // Check it contains `today` — exact time formatting is locale-dependent.
    expect(formatEventWhen(e, now)).toMatch(/^today · /);
  });

  it('reads "tomorrow · HH:MM" for next-day events', () => {
    const now = new Date('2026-05-01T08:00:00Z');
    const e = makeEvent('2026-05-02T19:00:00Z', '2026-05-02T20:00:00Z');
    expect(formatEventWhen(e, now)).toMatch(/^tomorrow · /);
  });
});
