// `/dashboard` — Keeper's Studio landing. Hero + KPI strip + activity
// feed. Everything data-driven is wrapped in `useFetchOrMock`; real
// mode shows "—" for KPIs that don't have a Supabase source yet (MRR,
// ROI, payout), sim mode shows the full fixture.
//
// Client component because the hook needs to respond to simulation
// toggle state. Real fetcher is a client-side Supabase call.

'use client';

import Link from 'next/link';

import {
  BronzeButton,
  DropCap,
  EnvelopeCard,
  Hand,
  Kicker,
  LedgerCard,
  Medallion,
  VellumCard,
} from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { STUDIO_FIXTURE, type DashboardStudioData } from '@/lib/fixtures/dashboard-studio';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

async function loadStudio(): Promise<DashboardStudioData> {
  // Real mode — only a subset of the studio fields have Supabase sources
  // today. The rest fall back to a "no data yet" placeholder. When the
  // backend grows MRR / ROI tracking, plug each field in here.
  const supabase = getSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from('memberships')
    .select('display_name')
    .eq('member_id', user.user?.id ?? '')
    .maybeSingle();

  // Courses count doubles as a rough "subscribers" placeholder until
  // actual membership/enrolment aggregates land.
  const { count: courseCount } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', user.user?.id ?? '');

  return {
    realm: {
      name: membership?.display_name ?? 'your realm',
      keeper: membership?.display_name?.split(' ')[0] ?? 'keeper',
      foundedLabel: '—',
      seal: (membership?.display_name ?? 'A').charAt(0).toUpperCase(),
    },
    greeting: 'good evening',
    money: {
      revenue: 0,
      revenueDelta: 0,
      mrr: 0,
      mrrDelta: 0,
      oneTime: 0,
      oneTimeDelta: 0,
      roi: 0,
      payoutNext: 0,
      payoutDate: '—',
    },
    subscribers: { totalPaying: courseCount ?? 0, delta: 0 },
    activity: [],
  };
}

function fmtMoney(n: number): string {
  if (n === 0) return '—';
  return `$${n.toLocaleString()}`;
}

function fmtDelta(n: number): string {
  if (n === 0) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}

function StudioContent({ data }: { readonly data: DashboardStudioData }): React.JSX.Element {
  const kpis: readonly { label: string; value: string; delta?: string }[] = [
    {
      label: 'revenue · 30d',
      value: fmtMoney(data.money.revenue),
      delta: fmtDelta(data.money.revenueDelta),
    },
    {
      label: 'recurring (MRR)',
      value: fmtMoney(data.money.mrr),
      delta: fmtDelta(data.money.mrrDelta),
    },
    {
      label: 'one-time sales',
      value: fmtMoney(data.money.oneTime),
      delta: fmtDelta(data.money.oneTimeDelta),
    },
    {
      label: 'paying subscribers',
      value: `${data.subscribers.totalPaying}`,
      delta: fmtDelta(data.subscribers.delta),
    },
    {
      label: 'return on spend',
      value: data.money.roi === 0 ? '—' : `${data.money.roi.toFixed(1)}x`,
    },
  ];

  return (
    <>
      <LedgerCard style={{ padding: '22px 26px', marginBottom: 22 }} rotate={-0.3}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
          {kpis.map((k, i) => (
            <div
              key={k.label}
              style={{
                borderLeft: i === 0 ? 'none' : '1px dashed rgba(90,63,34,0.35)',
                paddingLeft: i === 0 ? 0 : 16,
              }}
            >
              <Kicker>{k.label}</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 30,
                  color: 'var(--ink)',
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                {k.value}
              </div>
              {k.delta && <Hand>{k.delta}</Hand>}
            </div>
          ))}
        </div>
      </LedgerCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 22,
          marginBottom: 22,
        }}
      >
        <VellumCard rotate={0.3}>
          <Kicker>the coin jar · 30 days</Kicker>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 44,
              color: 'var(--ink)',
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            {fmtMoney(data.money.revenue)}
          </div>
          <Hand>~ against the long season ~</Hand>
          <div style={{ marginTop: 20 }}>
            <Kicker>next payout</Kicker>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontStyle: 'italic',
                fontSize: 20,
                marginTop: 4,
                color: 'var(--ink)',
              }}
            >
              {fmtMoney(data.money.payoutNext)} · {data.money.payoutDate}
            </div>
          </div>
        </VellumCard>

        <EnvelopeCard rotate={-0.4}>
          <Kicker>active folk</Kicker>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 44,
              color: 'var(--vellum)',
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            {data.subscribers.totalPaying}
          </div>
          <p style={{ color: 'var(--vellum)', marginTop: 10, fontStyle: 'italic', fontSize: 14 }}>
            scribes presently keeping your hours.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <Medallion emblem="✦" label="new" state="earned" />
            <Medallion emblem="☉" label="aged" state="aged" />
          </div>
        </EnvelopeCard>
      </div>

      <VellumCard style={{ marginBottom: 22 }}>
        <Kicker>what&rsquo;s happening</Kicker>
        {data.activity.length === 0 ? (
          <p className="body-italic" style={{ marginTop: 14, color: 'var(--ink-quiet)' }}>
            nothing new this hour. the ink is still drying.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
            {data.activity.map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'baseline',
                  padding: '10px 0',
                  borderBottom: '1px dashed rgba(90,63,34,0.2)',
                }}
              >
                <span style={{ color: 'var(--gilt)', fontSize: 18 }}>{a.icon}</span>
                <span className="body" style={{ flex: 1 }}>
                  {a.text}
                </span>
                <span style={{ color: 'var(--ink-quiet)', fontSize: 13 }}>{a.when}</span>
              </li>
            ))}
          </ul>
        )}
      </VellumCard>
    </>
  );
}

export default function StudioPage(): React.JSX.Element {
  const { data, loading, error } = useFetchOrMock<DashboardStudioData>(loadStudio, STUDIO_FIXTURE);

  const greetingName = data?.realm.keeper ?? 'keeper';

  return (
    <DashboardShell
      kicker="your studio"
      title={
        <>
          good evening,{' '}
          <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>{greetingName}</em>.
        </>
      }
      tagline="~ flip the toggle above to simulate a busy evening ~"
      actions={
        <Link href="/dashboard/courses" style={{ textDecoration: 'none' }}>
          <BronzeButton>+ new course</BronzeButton>
        </Link>
      }
    >
      <DropCapHero />
      {loading && <p className="hand on-dark">~ counting ~</p>}
      {error && <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>}
      {data && <StudioContent data={data} />}
    </DashboardShell>
  );
}

function DropCapHero(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, marginBottom: 26 }}>
      <DropCap letter="S" variant="wax" />
      <div style={{ paddingTop: 4 }}>
        <p className="body-italic" style={{ color: 'var(--vellum)' }}>
          five numbers kept on ledgers, one coin jar on the desk, an envelope of folk who
          haven&rsquo;t left — and the doings of the day in a margin.
        </p>
      </div>
    </div>
  );
}
