// Payouts fixture. Stripe Connect integration is post-Phase-8; this is
// the visual spec in simulation mode.

export type Payout = {
  readonly id: string;
  readonly amount: number;
  readonly status: 'paid' | 'pending' | 'in-transit';
  readonly initiatedOn: string; // ISO date
  readonly arrivedOn: string | null; // ISO date or null while in-transit
  readonly method: string; // "bank · ACH · ••4231"
};

export type PayoutsData = {
  readonly balance: number;
  readonly nextPayoutAmount: number;
  readonly nextPayoutDate: string;
  readonly paidThisMonth: number;
  readonly paidYearToDate: number;
  readonly method: string;
  /** Monthly totals for the last 6 months — drives the sparkline. */
  readonly monthlySeries: readonly number[];
  readonly recent: readonly Payout[];
};

export const PAYOUTS_FIXTURE: PayoutsData = {
  balance: 4700,
  nextPayoutAmount: 4700,
  nextPayoutDate: 'in 3 days',
  paidThisMonth: 4820,
  paidYearToDate: 26240,
  method: 'bank · ACH · ••4231',
  monthlySeries: [2100, 2680, 3040, 3520, 4076, 4820],
  recent: [
    {
      id: 'p1',
      amount: 4700,
      status: 'in-transit',
      initiatedOn: '2026-04-22',
      arrivedOn: null,
      method: 'bank · ACH · ••4231',
    },
    {
      id: 'p2',
      amount: 4076,
      status: 'paid',
      initiatedOn: '2026-03-22',
      arrivedOn: '2026-03-25',
      method: 'bank · ACH · ••4231',
    },
    {
      id: 'p3',
      amount: 3520,
      status: 'paid',
      initiatedOn: '2026-02-22',
      arrivedOn: '2026-02-24',
      method: 'bank · ACH · ••4231',
    },
    {
      id: 'p4',
      amount: 3040,
      status: 'paid',
      initiatedOn: '2026-01-22',
      arrivedOn: '2026-01-24',
      method: 'bank · ACH · ••4231',
    },
    {
      id: 'p5',
      amount: 2680,
      status: 'paid',
      initiatedOn: '2025-12-22',
      arrivedOn: '2025-12-24',
      method: 'bank · ACH · ••4231',
    },
    {
      id: 'p6',
      amount: 2100,
      status: 'paid',
      initiatedOn: '2025-11-22',
      arrivedOn: '2025-11-24',
      method: 'bank · ACH · ••4231',
    },
  ],
};
