// Events fixture — scheduled live events (Q&A, office hours, cohort
// kickoff) that creators run inside the tavern. Matches the `events`
// table shape from migration 20260424000001_phase9_feed_and_events.sql.
//
// `status` is a derived convenience for the UI — the DB only stores
// start/end timestamps and the app computes `past | upcoming | live`
// from `Date.now()` at render time (see `lib/events/status.ts`).

export type EventStatus = 'past' | 'upcoming' | 'live';

export type LiveEvent = {
  readonly id: string;
  readonly creatorId: string;
  readonly creatorName: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string; // ISO timestamp
  readonly endsAt: string;
  readonly streamUrl: string | null; // YouTube live URL
  /** Building id the event "happens in" — `tavern-a/b/c` etc. Drives
   *  the banner + the decision of which tavern shard to embed the
   *  stream into. */
  readonly location: string;
};

export type EventsData = {
  readonly events: readonly LiveEvent[];
};

/** Anchor for fixture timestamps. Matches `FEED_FIXTURE` so the two
 *  sources agree on "now". */
const NOW_ISO = '2026-04-24T22:30:00.000Z';

function offsetHours(hours: number): string {
  return new Date(Date.parse(NOW_ISO) + hours * 3_600_000).toISOString();
}

export const EVENTS_FIXTURE: EventsData = {
  events: [
    {
      id: 'e-live-now',
      creatorId: 'creator-rosalind',
      creatorName: 'Rosalind Ash',
      title: 'Wednesday · open hours',
      description:
        "Come sit in the tavern — I'll talk through the week's lessons, answer what comes, and share what's on the bench.",
      // Started half an hour ago, runs for another 45 minutes.
      startsAt: offsetHours(-0.5),
      endsAt: offsetHours(0.75),
      streamUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
      location: 'tavern-a',
    },
    {
      id: 'e-upcoming-friday',
      creatorId: 'creator-rosalind',
      creatorName: 'Rosalind Ash',
      title: 'Weekly Q&A',
      description:
        "Bring every question that's been saved up. I'll screen-share drafts of the next two lessons.",
      startsAt: offsetHours(44),
      endsAt: offsetHours(45.5),
      streamUrl: null, // not set yet — creator adds the link closer to the date
      location: 'tavern-a',
    },
    {
      id: 'e-upcoming-cohort',
      creatorId: 'creator-rosalind',
      creatorName: 'Rosalind Ash',
      title: 'Cohort · kickoff',
      description:
        'First meeting of the spring cohort. Introductions, reading list, the six rules of the hearth.',
      startsAt: offsetHours(144),
      endsAt: offsetHours(146),
      streamUrl: null,
      location: 'tavern-a',
    },
    {
      id: 'e-past-workshop',
      creatorId: 'creator-rosalind',
      creatorName: 'Rosalind Ash',
      title: 'Saturday workshop · the hammer',
      description: 'Short, hands-on. We covered the three common bends.',
      startsAt: offsetHours(-120),
      endsAt: offsetHours(-118),
      streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      location: 'tavern-a',
    },
  ],
};
