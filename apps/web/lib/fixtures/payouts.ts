// Payouts fixture. Stripe Connect integration is post-Phase-8; this is
// the visual spec in simulation mode.
//
// Shape mirrors the V4.5 kit's Payouts.jsx: hero KPIs, monthly
// sparkline, 7-col history with gross/fee/net split, per-transaction
// ledger, and tax-document envelope.

export type PayoutStatus = 'paid' | 'pending' | 'in-transit';

export type Payout = {
  readonly id: string;
  /** What we invoiced members for (before platform fee). */
  readonly gross: number;
  /** Stripe / platform cut. */
  readonly fee: number;
  /** gross − fee. The number that actually lands. */
  readonly net: number;
  readonly status: PayoutStatus;
  readonly initiatedOn: string; // ISO date
  readonly arrivedOn: string | null;
  readonly method: string;
  readonly reference: string; // "po_QpK3a2…"
};

export type TransactionKind = 'subscription' | 'course' | 'refund' | 'adjustment' | 'tip';

export type TransactionStatus = 'captured' | 'failed' | 'refunded';

export type PayoutTransaction = {
  readonly id: string;
  readonly when: string; // "Apr 22 · 10:12"
  readonly who: string;
  readonly description: string;
  readonly kind: TransactionKind;
  readonly gross: number;
  readonly fee: number;
  readonly net: number;
  readonly status: TransactionStatus;
};

export type TaxDocument = {
  readonly id: string;
  readonly kind: '1099-k' | 'statement';
  readonly period: string; // "2025" or "March 2026"
  readonly generatedOn: string; // "Mar 1, 2026"
  readonly url: string | null; // null while unavailable
};

export type PayoutsData = {
  readonly balance: number;
  readonly nextPayoutAmount: number;
  readonly nextPayoutDate: string;
  readonly paidThisMonth: number;
  readonly paidYearToDate: number;
  readonly method: string;
  readonly monthlySeries: readonly number[];
  readonly recent: readonly Payout[];
  readonly transactions: readonly PayoutTransaction[];
  readonly taxDocs: readonly TaxDocument[];
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
      gross: 4827,
      fee: 127,
      net: 4700,
      status: 'in-transit',
      initiatedOn: '2026-04-22',
      arrivedOn: null,
      method: 'bank · ACH · ••4231',
      reference: 'po_QpK3a2AxM1',
    },
    {
      id: 'p2',
      gross: 4188,
      fee: 112,
      net: 4076,
      status: 'paid',
      initiatedOn: '2026-03-22',
      arrivedOn: '2026-03-25',
      method: 'bank · ACH · ••4231',
      reference: 'po_QoJ9x7LtZ4',
    },
    {
      id: 'p3',
      gross: 3614,
      fee: 94,
      net: 3520,
      status: 'paid',
      initiatedOn: '2026-02-22',
      arrivedOn: '2026-02-24',
      method: 'bank · ACH · ••4231',
      reference: 'po_Qn7p2mLsW2',
    },
    {
      id: 'p4',
      gross: 3124,
      fee: 84,
      net: 3040,
      status: 'paid',
      initiatedOn: '2026-01-22',
      arrivedOn: '2026-01-24',
      method: 'bank · ACH · ••4231',
      reference: 'po_QmFcv9cNX0',
    },
    {
      id: 'p5',
      gross: 2756,
      fee: 76,
      net: 2680,
      status: 'paid',
      initiatedOn: '2025-12-22',
      arrivedOn: '2025-12-24',
      method: 'bank · ACH · ••4231',
      reference: 'po_QkAzzNh2T9',
    },
    {
      id: 'p6',
      gross: 2162,
      fee: 62,
      net: 2100,
      status: 'paid',
      initiatedOn: '2025-11-22',
      arrivedOn: '2025-11-24',
      method: 'bank · ACH · ••4231',
      reference: 'po_QiNlmQfJr4',
    },
  ],
  transactions: [
    {
      id: 't1',
      when: 'Apr 22 · 10:12',
      who: 'Theo Marrow',
      description: 'lantern-bearer · monthly',
      kind: 'subscription',
      gross: 24,
      fee: 1.2,
      net: 22.8,
      status: 'captured',
    },
    {
      id: 't2',
      when: 'Apr 22 · 09:48',
      who: 'Mira Blackthorn',
      description: 'Forge Basics · course',
      kind: 'course',
      gross: 79,
      fee: 2.8,
      net: 76.2,
      status: 'captured',
    },
    {
      id: 't3',
      when: 'Apr 22 · 04:02',
      who: 'Odie Snell',
      description: 'guildling · monthly',
      kind: 'subscription',
      gross: 8,
      fee: 0.5,
      net: 7.5,
      status: 'failed',
    },
    {
      id: 't4',
      when: 'Apr 21 · 19:55',
      who: 'Hazel Cairn',
      description: 'tip · for The Lantern’s Trim',
      kind: 'tip',
      gross: 12,
      fee: 0.7,
      net: 11.3,
      status: 'captured',
    },
    {
      id: 't5',
      when: 'Apr 21 · 16:08',
      who: 'Wren Ashford',
      description: 'A Keeper’s Craft · refund (partial)',
      kind: 'refund',
      gross: -30,
      fee: -1,
      net: -29,
      status: 'refunded',
    },
    {
      id: 't6',
      when: 'Apr 21 · 11:30',
      who: 'Iris Brack',
      description: 'hearth-keeper · monthly',
      kind: 'subscription',
      gross: 60,
      fee: 2,
      net: 58,
      status: 'captured',
    },
    {
      id: 't7',
      when: 'Apr 20 · 22:14',
      who: 'Cressida Vale',
      description: 'The Lantern’s Trim · course',
      kind: 'course',
      gross: 39,
      fee: 1.6,
      net: 37.4,
      status: 'captured',
    },
  ],
  taxDocs: [
    {
      id: 'tx2025',
      kind: '1099-k',
      period: '2025',
      generatedOn: 'Jan 31, 2026',
      url: '#',
    },
    {
      id: 'st-mar',
      kind: 'statement',
      period: 'March 2026',
      generatedOn: 'Apr 1, 2026',
      url: '#',
    },
    {
      id: 'st-feb',
      kind: 'statement',
      period: 'February 2026',
      generatedOn: 'Mar 1, 2026',
      url: '#',
    },
    {
      id: 'st-jan',
      kind: 'statement',
      period: 'January 2026',
      generatedOn: 'Feb 1, 2026',
      url: '#',
    },
  ],
};
