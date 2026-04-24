// Payouts tab surfaces, lifted out of payouts/page.tsx so the
// auth-gated production route and `/preview/payouts` share the exact
// same UI.
//
// Sections (mirror kit Payouts.jsx):
//  - KPI strip (balance / next payout / this month / year to date)
//  - Monthly sparkline (last six moons) via buildSparkline
//  - History table · 7 cols incl. gross / fee / net + reference
//  - Transactions ledger · per-txn row with glyph + status chip
//  - TaxDocs envelope · 1099-k + monthly statements + year selector

'use client';

import { useMemo, useState } from 'react';

import {
  Chip,
  EnvelopeCard,
  GhostButton,
  Hand,
  JournalCard,
  Kicker,
  LedgerCard,
  VellumCard,
} from '@/components/scriptorium';
import { buildSparkline } from '@/lib/charts/sparkline';
import type {
  Payout,
  PayoutStatus,
  PayoutTransaction,
  PayoutsData,
  TaxDocument,
  TransactionKind,
  TransactionStatus,
} from '@/lib/fixtures/payouts';

function fmt(n: number): string {
  if (n === 0) return '—';
  const rounded = Math.round(n * 100) / 100;
  const abs = Math.abs(rounded).toLocaleString(undefined, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (rounded < 0 ? '−$' : '$') + abs;
}

export function PayoutsContent({ data }: { readonly data: PayoutsData }): React.JSX.Element {
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
          <Kicker onDark>balance</Kicker>
          <BigNumber value={fmt(data.balance)} />
          <Hand onDark>~ in the jar today ~</Hand>
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker onDark>next payout</Kicker>
          <BigNumber value={fmt(data.nextPayoutAmount)} />
          <Hand onDark>{`~ ${data.nextPayoutDate} ~`}</Hand>
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker onDark>month · so far</Kicker>
          <BigNumber value={fmt(data.paidThisMonth)} />
        </EnvelopeCard>
        <EnvelopeCard>
          <Kicker onDark>year to date</Kicker>
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
            flexWrap: 'wrap',
            gap: 10,
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

      {data.transactions.length > 0 && (
        <LedgerCard style={{ marginTop: 22 }}>
          <Kicker>transactions · the coin, line by line</Kicker>
          <TransactionsTable rows={data.transactions} />
        </LedgerCard>
      )}

      {data.taxDocs.length > 0 && <TaxDocsCard docs={data.taxDocs} />}

      <VellumCard style={{ marginTop: 22 }}>
        <Kicker>bank + tax</Kicker>
        <p className="body-italic" style={{ marginTop: 8, color: 'var(--ink)' }}>
          Connecting Stripe and changing deposit method land in the next chapter.
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
        fontVariantNumeric: 'oldstyle-nums',
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
      <path d={area} fill="rgba(31, 49, 71, 0.14)" />
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

function StatusChip({ status }: { readonly status: PayoutStatus }): React.JSX.Element {
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
          <Th>reference</Th>
          <Th align="right">gross</Th>
          <Th align="right">fee</Th>
          <Th align="right">net</Th>
          <Th>status</Th>
          <Th>arrived</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
            <Td>
              <span className="mono" style={{ color: 'var(--ink)', fontSize: 12 }}>
                {p.initiatedOn}
              </span>
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                {p.reference}
              </span>
            </Td>
            <Td align="right">
              <MoneyCell value={p.gross} />
            </Td>
            <Td align="right">
              <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
                −{fmt(p.fee)}
              </span>
            </Td>
            <Td align="right">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: 'var(--oxblood)',
                  fontSize: 17,
                  fontVariantNumeric: 'oldstyle-nums',
                }}
              >
                {fmt(p.net)}
              </span>
            </Td>
            <Td>
              <StatusChip status={p.status} />
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12 }}>
                {p.arrivedOn ?? '—'}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const KIND_GLYPH: Record<TransactionKind, string> = {
  subscription: '♪',
  course: '✎',
  refund: '↩',
  adjustment: '§',
  tip: '✦',
};

function TransactionsTable({
  rows,
}: {
  readonly rows: readonly PayoutTransaction[];
}): React.JSX.Element {
  return (
    <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th>·</Th>
          <Th>when</Th>
          <Th>who</Th>
          <Th>what</Th>
          <Th align="right">gross</Th>
          <Th align="right">fee</Th>
          <Th align="right">net</Th>
          <Th>status</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
            <Td>
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(90,63,34,0.1)',
                  color: 'var(--bronze-deep)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                }}
              >
                {KIND_GLYPH[t.kind]}
              </span>
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                {t.when}
              </span>
            </Td>
            <Td>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--ink)',
                }}
              >
                {t.who}
              </span>
            </Td>
            <Td>
              <span className="body-italic" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {t.description}
              </span>
            </Td>
            <Td align="right">
              <MoneyCell value={t.gross} size={14} />
            </Td>
            <Td align="right">
              <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                {t.fee === 0 ? '—' : (t.fee < 0 ? '+' : '−') + fmt(Math.abs(t.fee))}
              </span>
            </Td>
            <Td align="right">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color:
                    t.net < 0
                      ? 'var(--wax)'
                      : t.status === 'captured'
                        ? 'var(--oxblood)'
                        : 'var(--ink-faint)',
                  fontSize: 15,
                  fontVariantNumeric: 'oldstyle-nums',
                }}
              >
                {fmt(t.net)}
              </span>
            </Td>
            <Td>
              <TxnStatusChip status={t.status} />
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MoneyCell({
  value,
  size = 15,
}: {
  readonly value: number;
  readonly size?: number;
}): React.JSX.Element {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: size,
        color: value < 0 ? 'var(--wax)' : 'var(--ink)',
        fontVariantNumeric: 'oldstyle-nums',
      }}
    >
      {fmt(value)}
    </span>
  );
}

function TxnStatusChip({ status }: { readonly status: TransactionStatus }): React.JSX.Element {
  if (status === 'captured') return <Chip variant="verdigris">captured</Chip>;
  if (status === 'failed') return <Chip variant="wax">failed</Chip>;
  return <Chip>refunded</Chip>;
}

function TaxDocsCard({ docs }: { readonly docs: readonly TaxDocument[] }): React.JSX.Element {
  const years = useMemo(() => {
    const setY = new Set<string>();
    for (const d of docs) {
      const m = d.period.match(/(\d{4})/);
      if (m) setY.add(m[1]!);
    }
    return Array.from(setY).sort().reverse();
  }, [docs]);

  const [year, setYear] = useState(years[0] ?? '');
  const filtered = year ? docs.filter((d) => d.period.includes(year)) : docs;

  const forms = filtered.filter((d) => d.kind === '1099-k');
  const statements = filtered.filter((d) => d.kind === 'statement');

  return (
    <EnvelopeCard style={{ padding: '22px 26px', marginTop: 22 }} rotate={-0.2}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Kicker onDark>the tax desk</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--vellum)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            forms + statements
          </h3>
        </div>
        {years.length > 1 && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--vellum)',
              background: 'transparent',
              border: '1px dashed var(--bronze)',
              borderRadius: 3,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {years.map((y) => (
              <option key={y} value={y} style={{ background: 'var(--leather-dark)' }}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
        }}
      >
        {forms.length > 0 && (
          <div>
            <Kicker onDark>forms</Kicker>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
              {forms.map((d) => (
                <TaxDocRow key={d.id} doc={d} accent="var(--wax)" />
              ))}
            </ul>
          </div>
        )}
        {statements.length > 0 && (
          <div>
            <Kicker onDark>monthly statements</Kicker>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
              {statements.map((d) => (
                <TaxDocRow key={d.id} doc={d} accent="var(--lantern)" />
              ))}
            </ul>
          </div>
        )}
      </div>
    </EnvelopeCard>
  );
}

function TaxDocRow({
  doc,
  accent,
}: {
  readonly doc: TaxDocument;
  readonly accent: string;
}): React.JSX.Element {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px dashed rgba(232, 213, 165, 0.18)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: accent,
          boxShadow: `0 0 8px ${accent}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--vellum)',
            lineHeight: 1.1,
          }}
        >
          {doc.kind === '1099-k' ? '1099-K · ' : ''}
          {doc.period}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: 1.3,
            color: 'var(--vellum-shadow)',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          generated {doc.generatedOn}
        </div>
      </div>
      <GhostButton size="sm" onDark disabled={!doc.url}>
        {doc.url ? 'download' : 'pending'}
      </GhostButton>
    </li>
  );
}

function Th({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return (
    <th
      style={{
        textAlign: align,
        padding: '10px',
        fontFamily: 'var(--font-caps)',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return (
    <td style={{ padding: '10px', textAlign: align, fontFamily: 'var(--font-body)', fontSize: 15 }}>
      {children}
    </td>
  );
}
