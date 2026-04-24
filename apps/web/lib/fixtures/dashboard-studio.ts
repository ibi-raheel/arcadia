// Mock fixture for the creator studio landing page. Mirrors the shape
// of `ui_kits/dashboard/data.v2.js` in the Phase-6 delivery. Consumers
// wrap their fetcher with `useFetchOrMock(realFetcher, STUDIO_FIXTURE)`.
//
// The real-data fetcher doesn't exist yet for most of these fields —
// MRR / ROI / payout forecasts need Supabase schema that Phase 8 does
// not add. Real mode shows "—" via the StudioHero KpiStrip fallback;
// simulation mode returns this fixture to demo the UI at full fidelity.

export type RevenueStream = {
  readonly label: string;
  readonly color: string;
  readonly share: number; // percent
  readonly amount: number;
};

export type SpendLine = {
  readonly label: string;
  readonly amount: number; // always a positive expense
};

export type StudioCourseRow = {
  readonly id: string;
  readonly title: string;
  readonly status: 'published' | 'draft' | 'review';
  readonly price: number;
  readonly lessons: number;
  readonly sales: number;
  readonly revenue: number;
  readonly completion?: number; // percent — published only
  readonly progress?: number; // percent — draft / review only
  readonly updated: string;
  readonly note?: string;
};

export type FunnelStage = {
  readonly stage: string;
  readonly count: number;
};

export type DashboardStudioData = {
  readonly realm: {
    readonly name: string;
    readonly keeper: string;
    readonly foundedLabel: string;
    readonly seal: string;
  };
  readonly greeting: string;
  readonly money: {
    readonly revenue: number;
    readonly revenueDelta: number;
    readonly mrr: number;
    readonly mrrDelta: number;
    readonly oneTime: number;
    readonly oneTimeDelta: number;
    readonly roi: number;
    readonly spend30d: number;
    readonly payoutNext: number;
    readonly payoutDate: string;
    readonly revenueSeries: readonly number[];
    readonly spendSeries: readonly number[];
    readonly revenueByStream: readonly RevenueStream[];
    readonly spendBreakdown: readonly SpendLine[];
  };
  readonly subscribers: {
    readonly totalPaying: number;
    readonly delta: number;
  };
  readonly myCourses: readonly StudioCourseRow[];
  readonly funnel: readonly FunnelStage[];
  readonly activity: readonly {
    readonly id: string;
    readonly icon: string;
    readonly text: string;
    readonly when: string;
  }[];
};

export const STUDIO_FIXTURE: DashboardStudioData = {
  realm: {
    name: 'the Rook & Lantern',
    keeper: 'Rosalind',
    foundedLabel: 'spring · XXIII',
    seal: 'R',
  },
  greeting: 'good evening',
  money: {
    revenue: 4820,
    revenueDelta: 18.2,
    mrr: 2180,
    mrrDelta: 6.4,
    oneTime: 2640,
    oneTimeDelta: 28.1,
    roi: 4.02,
    spend30d: 1198,
    payoutNext: 4700,
    payoutDate: 'in 3 days',
    // Two rising 30-day series (oxblood revenue on top, ink-quiet
    // spend under it). Last points match `revenue` / `spend30d`.
    revenueSeries: [
      72, 96, 128, 140, 158, 176, 162, 184, 198, 210, 220, 232, 244, 256, 260, 272, 280, 288, 296,
      302, 312, 324, 334, 346, 354, 360, 368, 378, 386, 394,
    ],
    spendSeries: [
      22, 24, 28, 30, 32, 30, 34, 38, 42, 44, 42, 46, 48, 50, 54, 56, 56, 58, 60, 62, 58, 60, 62,
      64, 64, 62, 64, 68, 70, 72,
    ],
    revenueByStream: [
      { label: 'memberships · monthly', color: 'var(--lantern)', share: 45, amount: 2180 },
      { label: 'one-time courses', color: 'var(--bronze)', share: 34, amount: 1640 },
      { label: 'tips + one-off', color: 'var(--oxblood)', share: 12, amount: 580 },
      { label: 'workshops', color: 'var(--verdigris)', share: 9, amount: 420 },
    ],
    spendBreakdown: [
      { label: 'cloudflare + hosting', amount: 48 },
      { label: 'newsletter sends', amount: 32 },
      { label: 'one paid ad · trial', amount: 180 },
      { label: 'Stripe fees (≈2.9%)', amount: 140 },
      { label: 'illustrator · cover', amount: 520 },
      { label: 'tools + software', amount: 78 },
      { label: 'misc. hand-work', amount: 200 },
    ],
  },
  subscribers: {
    totalPaying: 47,
    delta: 3.2,
  },
  myCourses: [
    {
      id: 'mc1',
      title: 'Forge Basics',
      status: 'published',
      price: 79,
      lessons: 12,
      sales: 58,
      revenue: 4582,
      completion: 74,
      updated: '4d ago',
    },
    {
      id: 'mc2',
      title: 'A Keeper’s Craft',
      status: 'published',
      price: 149,
      lessons: 18,
      sales: 24,
      revenue: 3576,
      completion: 52,
      updated: '9d ago',
    },
    {
      id: 'mc3',
      title: 'The Lantern’s Trim',
      status: 'published',
      price: 39,
      lessons: 6,
      sales: 112,
      revenue: 4368,
      completion: 81,
      updated: '2d ago',
    },
    {
      id: 'mc4',
      title: 'Inkwells of the North',
      status: 'draft',
      price: 99,
      lessons: 9,
      sales: 0,
      revenue: 0,
      progress: 62,
      updated: '1d ago',
      note: 'three lessons still dry',
    },
    {
      id: 'mc5',
      title: 'The Binder’s Oath',
      status: 'review',
      price: 129,
      lessons: 14,
      sales: 0,
      revenue: 0,
      progress: 96,
      updated: 'yesterday',
      note: 'a reader fetched for notes',
    },
    {
      id: 'mc6',
      title: 'Sealing Wax, by Lantern',
      status: 'draft',
      price: 0,
      lessons: 4,
      sales: 0,
      revenue: 0,
      progress: 35,
      updated: '4d ago',
    },
  ],
  funnel: [
    { stage: 'visitor', count: 1420 },
    { stage: 'browser', count: 820 },
    { stage: 'free trial', count: 136 },
    { stage: 'paying scribe', count: 47 },
  ],
  activity: [
    { id: 'a1', icon: '✦', text: 'Mira enrolled in Charcoal Portraits', when: '2 min ago' },
    { id: 'a2', icon: '☉', text: 'Theo sealed lesson VII in Forge Basics', when: '18 min ago' },
    { id: 'a3', icon: '❦', text: 'a kind word from Wren', when: '1 hr ago' },
    { id: 'a4', icon: '✧', text: 'Payout of $1,280 cleared', when: '4 hr ago' },
    { id: 'a5', icon: '◈', text: 'Cressida struck "seven suns"', when: 'yesterday' },
  ],
};
