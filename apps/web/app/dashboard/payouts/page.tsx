// `/dashboard/payouts` — coin jar. Shows balance, next payout, six-moon
// sparkline, history (7-col gross/fee/net), transaction ledger, and
// tax-documents envelope. Real-mode returns empty state until Stripe
// Connect lands.

'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, LedgerCard } from '@/components/scriptorium';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { PAYOUTS_FIXTURE, type PayoutsData } from '@/lib/fixtures/payouts';

import { PayoutsContent } from './_components/PayoutsContent';

async function loadPayouts(): Promise<PayoutsData> {
  // No Stripe Connect integration yet — every field is an unknown.
  return {
    balance: 0,
    nextPayoutAmount: 0,
    nextPayoutDate: '—',
    paidThisMonth: 0,
    paidYearToDate: 0,
    method: 'not connected',
    monthlySeries: [],
    recent: [],
    transactions: [],
    taxDocs: [],
  };
}

export default function PayoutsPage(): React.JSX.Element {
  const { data, loading, error } = useFetchOrMock<PayoutsData>(loadPayouts, PAYOUTS_FIXTURE);

  return (
    <DashboardShell
      kicker="payouts"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>coin jar</em>.
        </>
      }
      tagline="~ what&rsquo;s earned, what&rsquo;s in transit, where it lands ~"
    >
      {loading && <Hand onDark>~ counting ~</Hand>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <PayoutsContent data={data} />}
    </DashboardShell>
  );
}
