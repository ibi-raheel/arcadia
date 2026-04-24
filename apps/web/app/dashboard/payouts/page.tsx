// `/dashboard/payouts` — coin jar. Shows balance + next payout + last
// 6 months + recent history. Real mode reads `—` everywhere until
// Stripe Connect lands (post-Phase-8 ADR).

'use client';

import {
  Chip,
  EnvelopeCard,
  Hand,
  JournalCard,
  Kicker,
  LedgerCard,
  VellumCard,
} from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { buildSparkline } from '@/lib/charts/sparkline';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { PAYOUTS_FIXTURE, type Payout, type PayoutsData } from '@/lib/fixtures/payouts';

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
  };
}

function fmt(n: number): string {
  if (n === 0) return '—';
  return `$${n.toLocaleString()}`;
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
      {loading && <p className="hand on-dark">~ counting ~</p>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <PayoutsContent data={data} />}
    </DashboardShell>
  );
}

function PayoutsContent({ data }: { readonly data: PayoutsData }): React.JSX.Element {
  const hasSeries = data.monthlySeries.some((n) => n > 0);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <EnvelopeCard>
          <Kicker>balance</Kicker>
          <BigNumber value={fmt(data.balance)} />
          <Hand onDark>~ in the jar today ~</Hand>
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker>next payout</Kicker>
          <BigNumber value={fmt(data.nextPayoutAmount)} />
          <Hand onDark>{`~ ${data.nextPayoutDate} ~`}</Hand>
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker>month · so far</Kicker>
          <BigNumber value={fmt(data.paidThisMonth)} />
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker>year to date</Kicker>
          <BigNumber value={fmt(data.paidYearToDate)} />
        </EnvelopeCard>
      </div>

      <JournalCard style={{ marginBottom: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Kicker>monthly · last six moons</Kicker>
          <Hand>{`~ paid to · ${data.method} ~`}</Hand>
        </div>
        {hasSeries ? (
          <MonthlySparkline series={data.monthlySeries} />
        ) : (
          <p className="body-italic" style={{ color: 'var(--ink-quiet)' }}>
            No payouts yet. Once a pay cycle closes, the ledger lights up.
          </p>
        )}
      </JournalCard>

      <LedgerCard>
        <Kicker>recent history</Kicker>
        {data.recent.length === 0 ? (
          <p className="body-italic" style={{ marginTop: 10, color: 'var(--ink-quiet)' }}>
            Nothing on record.
          </p>
        ) : (
          <PayoutsTable rows={data.recent} />
        )}
      </LedgerCard>

      <VellumCard style={{ marginTop: 22 }}>
        <Kicker>bank + tax</Kicker>
        <p className="body-italic" style={{ marginTop: 8, color: 'var(--ink)' }}>
          Connecting Stripe, changing deposit method, and the tax documents desk land in the next
          chapter.
        </p>
        <Hand>~ the envelope is still in the wax ~</Hand>
      </VellumCard>
    </>
  );
}

function BigNumber({ value }: { readonly value: string }): React.JSX.Element {
  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 40,
        color: 'var(--vellum)',
        lineHeight: 1,
        marginTop: 6,
      }}
    >
      {value}
    </div>
  );
}

function MonthlySparkline({ series }: { readonly series: readonly number[] }): React.JSX.Element {
  const { line, area, viewBox, last } = buildSparkline([...series], { width: 600, height: 100 });
  return (
    <svg viewBox={viewBox} width="100%" height={110} preserveAspectRatio="none">
      <path d={area} fill="rgba(31,49,71,0.14)" />
      <path
        d={line}
        fill="none"
        stroke="var(--ink-blue)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={4} fill="var(--ink-blue)" />
    </svg>
  );
}

function StatusChip({ status }: { readonly status: Payout['status'] }): React.JSX.Element {
  if (status === 'paid') return <Chip variant="verdigris">paid</Chip>;
  if (status === 'in-transit') return <Chip variant="gilt">in transit</Chip>;
  return <Chip>pending</Chip>;
}

function PayoutsTable({ rows }: { readonly rows: readonly Payout[] }): React.JSX.Element {
  return (
    <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th>initiated</Th>
          <Th>amount</Th>
          <Th>status</Th>
          <Th>arrived</Th>
          <Th>method</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
            <Td>
              <span className="mono" style={{ color: 'var(--ink)' }}>
                {p.initiatedOn}
              </span>
            </Td>
            <Td>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  fontSize: 17,
                }}
              >
                {fmt(p.amount)}
              </span>
            </Td>
            <Td>
              <StatusChip status={p.status} />
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)' }}>
                {p.arrivedOn ?? '—'}
              </span>
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)' }}>
                {p.method}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '10px',
        fontFamily: 'var(--font-caps)',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'var(--bronze-deep)',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <td style={{ padding: '10px', fontFamily: 'var(--font-body)', fontSize: 15 }}>{children}</td>
  );
}
