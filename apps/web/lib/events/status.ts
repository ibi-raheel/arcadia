// Pure helpers for event rendering — kept out of component files so
// both server + client can share them and so they stay unit-testable
// without pulling in React.
//
// Import from "@/lib/events/status" in any surface that renders an
// event card (feed, dashboard, tavern banner).

import type { EventStatus, LiveEvent } from '@/lib/fixtures/events';

/** Given an event + current wall-clock, return whether it's past,
 *  live right now, or still upcoming. */
export function eventStatus(event: LiveEvent, now: Date = new Date()): EventStatus {
  const startsMs = Date.parse(event.startsAt);
  const endsMs = Date.parse(event.endsAt);
  const nowMs = now.getTime();
  if (nowMs < startsMs) return 'upcoming';
  if (nowMs >= startsMs && nowMs <= endsMs) return 'live';
  return 'past';
}

/** The first (chronological) upcoming or live event in a list. Events
 *  that are in the past are ignored. Returns null when nothing's on
 *  the calendar. */
export function nextEvent(events: readonly LiveEvent[], now: Date = new Date()): LiveEvent | null {
  const nowMs = now.getTime();
  const future = events
    .filter((e) => Date.parse(e.endsAt) >= nowMs)
    .slice()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return future[0] ?? null;
}

/** The event that's live RIGHT NOW (in any of the passed events).
 *  Returns the one that started most recently if multiple overlap,
 *  though the UI currently assumes at most one live event per realm. */
export function liveEvent(events: readonly LiveEvent[], now: Date = new Date()): LiveEvent | null {
  const nowMs = now.getTime();
  const running = events
    .filter((e) => Date.parse(e.startsAt) <= nowMs && Date.parse(e.endsAt) >= nowMs)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return running[0] ?? null;
}

/** "in 4 hours", "in 2 days", "just now", "yesterday", "3 days ago".
 *  Human-friendly relative time for timeline rendering. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = Date.parse(iso) - now.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  const suffix = diffMs < 0 ? ' ago' : '';
  const prefix = diffMs > 0 ? 'in ' : '';

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${prefix}${minutes}m${suffix}`;
  if (hours < 24) return `${prefix}${hours}h${suffix}`;
  if (days === 1 && diffMs < 0) return 'yesterday';
  if (days === 1 && diffMs > 0) return 'tomorrow';
  if (days < 7) return `${prefix}${days}d${suffix}`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${prefix}${weeks}w${suffix}`;
  }
  const months = Math.round(days / 30);
  return `${prefix}${months}mo${suffix}`;
}

/** Readable "when" for an event card — e.g. "Fri · 7:00 PM", or for
 *  today's events "today at 4:30 PM". Uses the browser's locale. */
export function formatEventWhen(event: LiveEvent, now: Date = new Date()): string {
  const start = new Date(event.startsAt);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dayDiff = Math.round((startDay.getTime() - nowDay.getTime()) / 86_400_000);

  const time = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (dayDiff === 0) return `today · ${time}`;
  if (dayDiff === 1) return `tomorrow · ${time}`;
  if (dayDiff === -1) return `yesterday · ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    return `${start.toLocaleDateString(undefined, { weekday: 'short' })} · ${time}`;
  }
  return `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${time}`;
}
