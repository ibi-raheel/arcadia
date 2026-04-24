// Feed fixture — async-feed posts surfaced at the tablet in the tavern
// ("what happened while you were away"). Matches the `posts` table
// shape from migration 20260424000001_phase9_feed_and_events.sql.
//
// FeedItem is a union of posts + upcoming events, merged into one
// timeline at render time. Event rows carry their event payload in
// `metadata` so the card can render the schedule without a second
// fetch.

export type FeedPostKind = 'text' | 'announcement' | 'event-created';

export type FeedPost = {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorSeal: string; // avatar initial
  readonly kind: FeedPostKind;
  readonly body: string;
  readonly createdAt: string; // ISO timestamp
  readonly metadata: Record<string, unknown>;
};

export type FeedData = {
  readonly posts: readonly FeedPost[];
};

/** Anchor so the "X minutes ago" labels read sensibly against the sim
 *  fixture. The feed renders relative times — `now - offset`. */
const NOW_ISO = '2026-04-24T22:30:00.000Z';

function minutesAgo(minutes: number): string {
  return new Date(Date.parse(NOW_ISO) - minutes * 60_000).toISOString();
}

export const FEED_FIXTURE: FeedData = {
  posts: [
    {
      id: 'p1',
      authorId: 'creator-rosalind',
      authorName: 'Rosalind Ash',
      authorSeal: 'R',
      kind: 'announcement',
      body: "New course out — **A Keeper's Craft** — the follow-up to Forge Basics. If you've been waiting, it's open.",
      createdAt: minutesAgo(90),
      metadata: {},
    },
    {
      id: 'p2',
      authorId: 'creator-rosalind',
      authorName: 'Rosalind Ash',
      authorSeal: 'R',
      kind: 'event-created',
      body: 'Weekly Q&A · Friday at 7 PM in the Tavern.',
      createdAt: minutesAgo(180),
      metadata: { event_id: 'e1' },
    },
    {
      id: 'p3',
      authorId: 'creator-rosalind',
      authorName: 'Rosalind Ash',
      authorSeal: 'R',
      kind: 'text',
      body: "Three lessons still drying for the next scroll — *Inkwells of the North*. If you've opinions on the order, the tavern's the place.",
      createdAt: minutesAgo(420),
      metadata: {},
    },
    {
      id: 'p4',
      authorId: 'creator-rosalind',
      authorName: 'Rosalind Ash',
      authorSeal: 'R',
      kind: 'text',
      body: 'Week of quiet work. Tomorrow I post the office-hours recording for the Wednesday session.',
      createdAt: minutesAgo(1280),
      metadata: {},
    },
    {
      id: 'p5',
      authorId: 'creator-rosalind',
      authorName: 'Rosalind Ash',
      authorSeal: 'R',
      kind: 'announcement',
      body: "Lantern's Trim finished its first hundred sales. A warm thank-you — and a second printing is being prepared.",
      createdAt: minutesAgo(2860),
      metadata: {},
    },
  ],
};
