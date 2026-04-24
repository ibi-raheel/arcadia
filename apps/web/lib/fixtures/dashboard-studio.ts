// Mock fixture for the creator studio landing page. Mirrors the shape
// of `ui_kits/dashboard/data.v2.js` in the Phase-6 delivery. Consumers
// wrap their fetcher with `useFetchOrMock(realFetcher, STUDIO_FIXTURE)`.
//
// The real-data fetcher doesn't exist yet for most of these fields —
// MRR / ROI / payout forecasts need Supabase schema that Phase 8 does
// not add. Real mode shows "—" via the StudioHero KpiStrip fallback;
// simulation mode returns this fixture to demo the UI at full fidelity.

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
    readonly payoutNext: number;
    readonly payoutDate: string;
  };
  readonly subscribers: {
    readonly totalPaying: number;
    readonly delta: number;
  };
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
    payoutNext: 4700,
    payoutDate: 'in 3 days',
  },
  subscribers: {
    totalPaying: 47,
    delta: 3.2,
  },
  activity: [
    { id: 'a1', icon: '✦', text: 'Mira enrolled in Charcoal Portraits', when: '2 min ago' },
    { id: 'a2', icon: '☉', text: 'Theo sealed lesson VII in Forge Basics', when: '18 min ago' },
    { id: 'a3', icon: '❦', text: 'a kind word from Wren', when: '1 hr ago' },
    { id: 'a4', icon: '✧', text: 'Payout of $1,280 cleared', when: '4 hr ago' },
    { id: 'a5', icon: '◈', text: 'Cressida struck "seven suns"', when: 'yesterday' },
  ],
};
