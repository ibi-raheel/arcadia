// Merged memberships + audience fixture. A folk roll — everyone in the
// realm, paying or not, plus the headline counts a keeper reads before
// opening the list. Also carries the tier / MRR / growth / retention
// shape the V4.5 kit's Memberships + Audience tabs rendered, so the
// merged `folk` page can surface all of it without an extra fetch.

export type FolkRole = 'scribe' | 'keeper' | 'wanderer';

export type FolkMember = {
  readonly id: string;
  readonly name: string;
  readonly seal: string; // single-letter avatar initial
  readonly role: FolkRole;
  readonly enrolmentCount: number;
  readonly xp: number;
  readonly level: number;
  readonly streakDays: number;
  readonly lastSeen: string;
  readonly note?: string; // Caveat-hand aside rendered next to the row
};

/** A subscription tier the keeper offers. `rate === 0` means the tier is
 *  free (wanderer). Colors pick from the scriptorium palette so the
 *  MRRBlock composition bar + TierCard badge can tint consistently. */
export type FolkTier = {
  readonly key: 'wanderer' | 'guildling' | 'lantern-bearer' | 'hearth-keeper' | 'patron';
  readonly name: string;
  readonly desc: string;
  readonly color: string; // CSS color value (hex or var())
  readonly rate: number; // $/mo, 0 for free
  readonly count: number; // number of subscribers
  readonly benefits: readonly string[];
};

/** Total MRR + comparisons. Kept separate from `totalPaying` so the
 *  block can show the "$X,XXX · ▲6.4% vs prev" composite. */
export type FolkMoney = {
  readonly mrr: number;
  readonly mrrDelta: number; // percent
};

/** Retention curve for one tier — percentage (0–100) retained at the
 *  end of each month since sign-up. `data[0]` is month-1 (100 unless
 *  churn is very fast), `data[11]` is month-12. */
export type FolkRetentionCurve = {
  readonly label: string;
  readonly color: string; // CSS color (hex or var())
  readonly data: readonly number[];
};

/** A single "at risk" entry — someone who's flagged for possible
 *  churn. Drives the AtRisk envelope card. */
export type FolkRiskUrgency = 'high' | 'medium' | 'low';
export type FolkAtRiskEntry = {
  readonly who: string;
  readonly tier: string;
  readonly reason: string;
  readonly urgency: FolkRiskUrgency;
};

/** One acquisition source — drives the "how they found you" horizontal
 *  bars panel. `share` is a percent of total signups; the card computes
 *  bar widths from count/max so shares can drift without math errors. */
export type FolkAcquisitionSource = {
  readonly source: string;
  readonly count: number;
  readonly share: number; // percent
  readonly color: string; // CSS color
};

/** One geographic bucket for the "they live in" bars panel. */
export type FolkGeoEntry = {
  readonly place: string;
  readonly count: number;
  readonly share: number;
};

/** Audience growth hero numbers — feeds the 30-day sparkline card that
 *  sits at the very top of /folk. When `series` is empty the card
 *  still renders numbers but suppresses the sparkline. */
export type FolkGrowth = {
  readonly totalPeople: number;
  readonly new30d: number;
  readonly growthDelta: number; // percent vs previous 30 days
  readonly newsletter: number;
  readonly followers: number;
  /** Daily total-people count for the last 30 days, oldest → newest. */
  readonly series: readonly number[];
};

export type FolkData = {
  readonly totalPaying: number;
  readonly totalFolk: number;
  readonly newThisWeek: number;
  readonly churnRisk: number; // count of folk unseen > 14 days
  readonly money: FolkMoney;
  readonly tiers: readonly FolkTier[];
  readonly retentionCurves: readonly FolkRetentionCurve[];
  readonly atRisk: readonly FolkAtRiskEntry[];
  readonly growth: FolkGrowth;
  readonly acquisition: readonly FolkAcquisitionSource[];
  readonly geography: readonly FolkGeoEntry[];
  readonly members: readonly FolkMember[];
};

export const FOLK_FIXTURE: FolkData = {
  totalPaying: 47,
  totalFolk: 312,
  newThisWeek: 9,
  churnRisk: 4,
  money: {
    // Exact sum of tier (count × rate): 28·8 + 14·24 + 4·60 + 1·180 = 980.
    mrr: 980,
    mrrDelta: 6.4,
  },
  tiers: [
    {
      key: 'wanderer',
      name: 'wanderer',
      desc: 'browsing the realm, free of charge',
      color: 'var(--ink-faint)',
      rate: 0,
      count: 265,
      benefits: ['browse the realm', 'read free letters', 'one course on the house'],
    },
    {
      key: 'guildling',
      name: 'guildling',
      desc: 'a first promise, modest ink',
      color: 'var(--bronze)',
      rate: 8,
      count: 28,
      benefits: ['chat · the hearth', 'weekly letter', '10% off keepsakes'],
    },
    {
      key: 'lantern-bearer',
      name: 'lantern-bearer',
      desc: 'full shelf, steady candle',
      color: 'var(--lantern)',
      rate: 24,
      count: 14,
      benefits: ['all published courses', 'office hours · monthly', 'early drafts to read'],
    },
    {
      key: 'hearth-keeper',
      name: 'hearth-keeper',
      desc: 'a seat near the fire, a name on the door',
      color: 'var(--wax)',
      rate: 60,
      count: 4,
      benefits: ['1:1 letters · quarterly', 'private channel', 'your name in the colophon'],
    },
    {
      key: 'patron',
      name: 'patron',
      desc: 'the wall has your mark',
      color: 'var(--oxblood)',
      rate: 180,
      count: 1,
      benefits: ['name on the wall', 'every new scroll free', 'dinner when I pass through'],
    },
  ],
  retentionCurves: [
    {
      label: 'guildling',
      // Hex rather than `var(--bronze)` — CSS variables don't resolve
      // consistently in SVG stroke under all Chromium versions. The
      // tier palette below matches the `tiers[].color` tokens.
      color: '#8a6a3a', // --bronze
      // Month-1 through month-12 retention %. Flattens around 36% by
      // year-end — realistic for a cheap entry tier.
      data: [100, 82, 68, 58, 51, 46, 42, 40, 38, 37, 36, 36],
    },
    {
      label: 'lantern-bearer',
      color: '#f2c469', // --lantern
      data: [100, 92, 84, 78, 74, 70, 68, 66, 64, 63, 62, 62],
    },
    {
      label: 'hearth-keeper',
      color: '#8f2530', // --wax
      data: [100, 97, 94, 92, 90, 88, 87, 86, 86, 85, 85, 85],
    },
  ],
  growth: {
    totalPeople: 312,
    new30d: 48,
    growthDelta: 12.4,
    newsletter: 186,
    followers: 265,
    // Rising-ish 30-day daily totalPeople counts. Ends at 312 to match
    // `totalPeople` above; the shape is gently upward with a small dip
    // to look organic under the oxblood sparkline.
    series: [
      264, 266, 269, 270, 273, 275, 278, 279, 282, 284, 285, 288, 290, 289, 290, 293, 296, 297, 300,
      301, 301, 303, 305, 306, 307, 309, 308, 310, 311, 312,
    ],
  },
  acquisition: [
    { source: 'the letter', count: 132, share: 42, color: '#f2c469' }, // --lantern
    { source: 'word of mouth', count: 78, share: 25, color: '#8a6a3a' }, // --bronze
    { source: 'search', count: 48, share: 15, color: '#5a7a5c' }, // --verdigris
    { source: 'the forums', count: 30, share: 10, color: '#8f2530' }, // --wax
    { source: 'paid · ads', count: 15, share: 5, color: '#6d1a24' }, // --oxblood
    { source: 'unknown road', count: 9, share: 3, color: '#735844' }, // --ink-quiet
  ],
  geography: [
    { place: 'London · England', count: 84, share: 27 },
    { place: 'Brooklyn · NY', count: 52, share: 17 },
    { place: 'Kyoto · Japan', count: 38, share: 12 },
    { place: 'Berlin · Germany', count: 29, share: 9 },
    { place: 'Mexico City · MX', count: 24, share: 8 },
    { place: 'elsewhere', count: 85, share: 27 },
  ],
  atRisk: [
    {
      who: 'Calla Wright',
      tier: 'guildling',
      reason: 'payment failed · 6 days',
      urgency: 'high',
    },
    {
      who: 'Nan Gorse',
      tier: 'lantern-bearer',
      reason: "hasn't opened a letter in 30d",
      urgency: 'medium',
    },
    {
      who: 'Pascal Vane',
      tier: 'guildling',
      reason: 'downgraded from bearer · Jan',
      urgency: 'medium',
    },
    {
      who: 'Iris Brack',
      tier: 'hearth-keeper',
      reason: 'cancelled · effective in 14d',
      urgency: 'high',
    },
    {
      who: 'Odie Snell',
      tier: 'guildling',
      reason: 'free-trial ends tomorrow',
      urgency: 'low',
    },
  ],
  members: [
    {
      id: 'f1',
      name: 'Mira Blackthorn',
      seal: 'M',
      role: 'scribe',
      enrolmentCount: 4,
      xp: 860,
      level: 4,
      streakDays: 23,
      lastSeen: '4 min ago',
      note: '~ signed Forge Basics today ~',
    },
    {
      id: 'f2',
      name: 'Theo Marrow',
      seal: 'T',
      role: 'scribe',
      enrolmentCount: 7,
      xp: 1840,
      level: 5,
      streakDays: 61,
      lastSeen: '18 min ago',
    },
    {
      id: 'f3',
      name: 'Cressida Vale',
      seal: 'C',
      role: 'keeper',
      enrolmentCount: 2,
      xp: 340,
      level: 3,
      streakDays: 7,
      lastSeen: '2 hr ago',
      note: '~ moderating the tavern ~',
    },
    {
      id: 'f4',
      name: 'Wren Ashford',
      seal: 'W',
      role: 'scribe',
      enrolmentCount: 5,
      xp: 720,
      level: 4,
      streakDays: 14,
      lastSeen: '3 hr ago',
    },
    {
      id: 'f5',
      name: 'Oren Fallow',
      seal: 'O',
      role: 'wanderer',
      enrolmentCount: 1,
      xp: 110,
      level: 2,
      streakDays: 2,
      lastSeen: '5 hr ago',
    },
    {
      id: 'f6',
      name: 'Juno Astor',
      seal: 'J',
      role: 'scribe',
      enrolmentCount: 3,
      xp: 520,
      level: 3,
      streakDays: 9,
      lastSeen: 'yesterday',
    },
    {
      id: 'f7',
      name: 'Silas Rook',
      seal: 'S',
      role: 'wanderer',
      enrolmentCount: 0,
      xp: 40,
      level: 1,
      streakDays: 0,
      lastSeen: 'yesterday',
      note: '~ browsed, has not enrolled ~',
    },
    {
      id: 'f8',
      name: 'Hazel Cairn',
      seal: 'H',
      role: 'scribe',
      enrolmentCount: 6,
      xp: 1480,
      level: 5,
      streakDays: 42,
      lastSeen: '2 days ago',
    },
    {
      id: 'f9',
      name: 'Briar Shaw',
      seal: 'B',
      role: 'scribe',
      enrolmentCount: 2,
      xp: 280,
      level: 3,
      streakDays: 0,
      lastSeen: '3 days ago',
    },
    {
      id: 'f10',
      name: 'Eulalia Hart',
      seal: 'E',
      role: 'scribe',
      enrolmentCount: 4,
      xp: 960,
      level: 4,
      streakDays: 0,
      lastSeen: '6 days ago',
    },
    {
      id: 'f11',
      name: 'Rowan Gile',
      seal: 'R',
      role: 'wanderer',
      enrolmentCount: 1,
      xp: 120,
      level: 2,
      streakDays: 0,
      lastSeen: '2 weeks ago',
      note: '~ gone quiet ~',
    },
    {
      id: 'f12',
      name: 'Nell Arden',
      seal: 'N',
      role: 'wanderer',
      enrolmentCount: 0,
      xp: 0,
      level: 1,
      streakDays: 0,
      lastSeen: '3 weeks ago',
      note: '~ gone quiet ~',
    },
  ],
};
