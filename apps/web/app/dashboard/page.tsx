// `/dashboard` — Keeper's Studio landing. Hero + KPIs + Revenue/ROI
// donut card + inline MyCourses table + subscribers envelope + funnel
// + activity feed. Client component so the simulation toggle drives
// useFetchOrMock.

'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  BarProgress,
  BronzeButton,
  Donut,
  DropCap,
  EnvelopeCard,
  Hand,
  Kicker,
  LedgerCard,
  Medallion,
  Stat,
  VellumCard,
} from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { buildSparkline } from '@/lib/charts/sparkline';
import {
  STUDIO_FIXTURE,
  type DashboardStudioData,
  type StudioCourseRow,
} from '@/lib/fixtures/dashboard-studio';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

async function loadStudio(): Promise<DashboardStudioData> {
  // Real mode — only a subset of the studio fields have Supabase sources
  // today. The rest fall back to "no data yet" placeholders.
  const supabase = getSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from('memberships')
    .select('display_name')
    .eq('member_id', user.user?.id ?? '')
    .maybeSingle();

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
      spend30d: 0,
      payoutNext: 0,
      payoutDate: '—',
      revenueSeries: [],
      spendSeries: [],
      revenueByStream: [],
      spendBreakdown: [],
    },
    subscribers: { totalPaying: courseCount ?? 0, delta: 0 },
    myCourses: [],
    funnel: [],
    activity: [],
  };
}

function fmtMoney(n: number): string {
  if (n === 0) return '—';
  return `$${n.toLocaleString()}`;
}

function StudioContent({ data }: { readonly data: DashboardStudioData }): React.JSX.Element {
  const hasRevenue = data.money.revenue > 0;
  return (
    <>
      {/* KPI strip — 5 cols via the shared Stat primitive. */}
      <LedgerCard style={{ padding: '20px 26px', marginBottom: 22 }} rotate={-0.3}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
          <KpiCell
            label="revenue · 30d"
            value={fmtMoney(data.money.revenue)}
            delta={data.money.revenueDelta}
            first
          />
          <KpiCell
            label="recurring · MRR"
            value={fmtMoney(data.money.mrr)}
            delta={data.money.mrrDelta}
          />
          <KpiCell
            label="one-time sales"
            value={fmtMoney(data.money.oneTime)}
            delta={data.money.oneTimeDelta}
          />
          <KpiCell
            label="paying subscribers"
            value={data.subscribers.totalPaying > 0 ? `${data.subscribers.totalPaying}` : '—'}
            delta={data.subscribers.delta}
          />
          <KpiCell
            label="return on spend"
            value={data.money.roi === 0 ? '—' : `${data.money.roi.toFixed(1)}×`}
          />
        </div>
      </LedgerCard>

      {/* Revenue/ROI card + Active folk envelope */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 22,
          marginBottom: 22,
        }}
      >
        <RevenueRoiCard data={data} />
        <ActiveFolkCard subscribers={data.subscribers} />
      </div>

      {/* MyCourses filter-table */}
      {data.myCourses.length > 0 && <MyCoursesTable courses={data.myCourses} />}

      {/* Funnel + Activity row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
          gap: 22,
          marginTop: 22,
          marginBottom: 22,
        }}
      >
        {data.funnel.length > 0 ? <FunnelCard stages={data.funnel} /> : <div />}
        <ActivityFeed activity={data.activity} />
      </div>

      {!hasRevenue && (
        <VellumCard>
          <Kicker>real mode · not yet wired</Kicker>
          <p className="body-italic" style={{ marginTop: 10, color: 'var(--ink)' }}>
            Flip the simulation toggle up top to see the studio at full fidelity. Revenue, MRR, and
            the ROI ledger arrive with the Stripe Connect chapter.
          </p>
        </VellumCard>
      )}
    </>
  );
}

function KpiCell({
  label,
  value,
  delta,
  first = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly delta?: number;
  readonly first?: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        borderLeft: first ? 'none' : '1px dashed rgba(90,63,34,0.35)',
        paddingLeft: first ? 0 : 16,
      }}
    >
      <Stat label={label} value={value} delta={delta === 0 ? undefined : delta} />
    </div>
  );
}

function RevenueRoiCard({ data }: { readonly data: DashboardStudioData }): React.JSX.Element {
  const { money } = data;
  const spendTotal = money.spendBreakdown.reduce((s, x) => s + x.amount, 0);
  const net = money.revenue - money.spend30d;
  const revSparkline =
    money.revenueSeries.length >= 2
      ? buildSparkline([...money.revenueSeries], { width: 240, height: 56 })
      : null;
  const spendSparkline =
    money.spendSeries.length >= 2
      ? buildSparkline([...money.spendSeries], { width: 240, height: 28 })
      : null;

  return (
    <VellumCard style={{ padding: '24px 26px' }} rotate={0.3}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <Kicker>the coin jar · 30 days</Kicker>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 36,
              color: 'var(--ink)',
              lineHeight: 1,
              marginTop: 4,
              fontVariantNumeric: 'oldstyle-nums',
            }}
          >
            {fmtMoney(money.revenue)}
          </div>
          <Hand>~ earned · against {fmtMoney(money.spend30d)} spent ~</Hand>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {revSparkline && (
            <svg viewBox={revSparkline.viewBox} width="240" height="56" preserveAspectRatio="none">
              <path d={revSparkline.area} fill="#6d1a24" opacity="0.16" />
              <path
                d={revSparkline.line}
                fill="none"
                style={{ stroke: '#6d1a24', strokeWidth: 2 }}
              />
              <circle cx={revSparkline.last.x} cy={revSparkline.last.y} r="3" fill="#6d1a24" />
            </svg>
          )}
          {spendSparkline && (
            <svg
              viewBox={spendSparkline.viewBox}
              width="240"
              height="28"
              preserveAspectRatio="none"
            >
              <path
                d={spendSparkline.line}
                fill="none"
                style={{ stroke: '#735844', strokeWidth: 1.5, strokeDasharray: '3 3' }}
              />
            </svg>
          )}
        </div>
      </div>

      {money.revenueByStream.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 22,
            alignItems: 'center',
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <Donut segments={money.revenueByStream} size={140} thickness={22} />
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {money.revenueByStream.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {s.label}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                  {s.share}%
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--ink)',
                    minWidth: 60,
                    textAlign: 'right',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  {fmtMoney(s.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI ledger */}
      {money.spendBreakdown.length > 0 && (
        <div style={{ paddingTop: 14, borderTop: '1px dashed rgba(90,63,34,0.35)' }}>
          <Kicker>where the coin went · 30d</Kicker>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 18,
              marginTop: 10,
            }}
          >
            <div>
              {money.spendBreakdown.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                    fontFamily: 'var(--font-body)',
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: 'var(--ink)',
                  }}
                >
                  <span>{s.label}</span>
                  <span style={{ fontVariantNumeric: 'oldstyle-nums' }}>−${s.amount}</span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: '1px solid var(--bronze-deep)',
                  marginTop: 4,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: 'var(--ink)',
                }}
              >
                <span>kept</span>
                <span style={{ color: 'var(--verdigris-2)', fontVariantNumeric: 'oldstyle-nums' }}>
                  +${net.toLocaleString()}
                </span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(143, 37, 48, 0.06)',
                padding: '12px 14px',
                border: '1px dashed var(--oxblood)',
                borderRadius: 2,
              }}
            >
              <Kicker>return on spend</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 44,
                  color: 'var(--oxblood)',
                  lineHeight: 1,
                  marginTop: 4,
                  fontVariantNumeric: 'oldstyle-nums',
                }}
              >
                {money.roi.toFixed(2)}×
              </div>
              <Hand>~ every coin spent returns four ~</Hand>
              {spendTotal > 0 && (
                <div
                  className="mono"
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    letterSpacing: 1.2,
                    color: 'var(--ink-faint)',
                    textTransform: 'uppercase',
                  }}
                >
                  spent ${spendTotal.toLocaleString()} · earned ${money.revenue.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </VellumCard>
  );
}

function ActiveFolkCard({
  subscribers,
}: {
  readonly subscribers: DashboardStudioData['subscribers'];
}): React.JSX.Element {
  return (
    <EnvelopeCard rotate={-0.4}>
      <Kicker onDark>active folk</Kicker>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 48,
          color: 'var(--vellum)',
          lineHeight: 1,
          marginTop: 6,
          fontVariantNumeric: 'oldstyle-nums',
        }}
      >
        {subscribers.totalPaying}
      </div>
      <p className="body-italic" style={{ color: 'var(--vellum)', marginTop: 10, fontSize: 14 }}>
        scribes presently keeping your hours.
      </p>
      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Medallion emblem="✦" label="new" state="earned" />
        <Medallion emblem="☉" label="aged" state="aged" />
      </div>
    </EnvelopeCard>
  );
}

const COURSE_FILTERS = ['all', 'published', 'draft', 'review'] as const;
type CourseFilter = (typeof COURSE_FILTERS)[number];

function MyCoursesTable({
  courses,
}: {
  readonly courses: readonly StudioCourseRow[];
}): React.JSX.Element {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const counts: Record<CourseFilter, number> = {
    all: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
    review: courses.filter((c) => c.status === 'review').length,
  };
  const filtered = filter === 'all' ? courses : courses.filter((c) => c.status === filter);

  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={-0.2}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Kicker>your scrolls · the making of</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 26,
              color: 'var(--ink)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            my courses
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COURSE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 20,
                background: filter === f ? 'var(--ink)' : 'transparent',
                color: filter === f ? 'var(--vellum)' : 'var(--ink-soft)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                border: `1px solid ${filter === f ? 'var(--ink)' : 'var(--bronze-deep)'}`,
              }}
            >
              {f} · {counts[f]}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 80px 80px 90px 1.2fr 70px',
          gap: 14,
          padding: '8px 4px',
          borderBottom: '1.5px solid var(--bronze-deep)',
          fontFamily: 'var(--font-caps)',
          fontSize: 10,
          letterSpacing: 1.4,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        <span>scroll</span>
        <span style={{ textAlign: 'right' }}>lessons</span>
        <span style={{ textAlign: 'right' }}>sales</span>
        <span style={{ textAlign: 'right' }}>revenue</span>
        <span>status · finish</span>
        <span style={{ textAlign: 'right' }}></span>
      </div>

      {filtered.map((c, i) => (
        <CourseRow key={c.id} course={c} last={i === filtered.length - 1} />
      ))}
    </VellumCard>
  );
}

function CourseRow({
  course,
  last,
}: {
  readonly course: StudioCourseRow;
  readonly last: boolean;
}): React.JSX.Element {
  const statusLabel =
    course.status === 'published'
      ? '✦ published'
      : course.status === 'review'
        ? '◉ in review'
        : '✎ draft';
  const statusColor =
    course.status === 'published'
      ? 'var(--verdigris)'
      : course.status === 'review'
        ? 'var(--oxblood)'
        : 'var(--ink-faint)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 80px 80px 90px 1.2fr 70px',
        gap: 14,
        alignItems: 'center',
        padding: '14px 4px',
        borderBottom: last ? 'none' : '1px dashed rgba(90,63,34,0.25)',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          {course.title}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: 1.2,
            color: 'var(--ink-faint)',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          ${course.price} · updated {course.updated}
          {course.note && <span style={{ color: 'var(--oxblood)' }}> · {course.note}</span>}
        </div>
      </div>
      <MoneyCell value={course.lessons} color="var(--ink)" />
      <MoneyCell value={course.sales} color={course.sales ? 'var(--ink)' : 'var(--ink-faint)'} />
      <MoneyCell
        value={course.revenue === 0 ? '—' : `$${course.revenue.toLocaleString()}`}
        color={course.revenue ? 'var(--oxblood)' : 'var(--ink-faint)'}
      />
      <div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 1.2,
            color: statusColor,
            textTransform: 'uppercase',
          }}
        >
          {statusLabel}
        </div>
        {course.status === 'published' ? (
          <div style={{ marginTop: 6 }}>
            <BarProgress pct={course.completion ?? 0} color="var(--verdigris)" height={4} />
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 2 }}>
              {course.completion ?? 0}% finish rate
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <BarProgress
              pct={course.progress ?? 0}
              color={course.status === 'review' ? 'var(--oxblood)' : 'var(--lantern)'}
              height={4}
            />
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 2 }}>
              {course.progress ?? 0}% ready
            </div>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <Link
          href={`/dashboard/courses/${course.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--oxblood)',
            textDecoration: 'none',
          }}
        >
          {course.status === 'published' ? 'edit →' : 'continue →'}
        </Link>
      </div>
    </div>
  );
}

function MoneyCell({
  value,
  color,
}: {
  readonly value: number | string;
  readonly color: string;
}): React.JSX.Element {
  return (
    <div
      style={{
        textAlign: 'right',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 18,
        color,
        fontVariantNumeric: 'oldstyle-nums',
      }}
    >
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
  );
}

function FunnelCard({
  stages,
}: {
  readonly stages: readonly { stage: string; count: number }[];
}): React.JSX.Element {
  const max = stages[0]?.count ?? 1;
  return (
    <EnvelopeCard style={{ padding: '22px 24px' }} rotate={0.3}>
      <Kicker onDark>the path to your table</Kicker>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--vellum)',
          margin: '4px 0 0',
          lineHeight: 1.1,
        }}
      >
        how they find you
      </h3>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {stages.map((f, i) => {
          const prev = i === 0 ? null : stages[i - 1]!.count;
          const rate = prev ? Math.round((f.count / prev) * 100) : null;
          const last = i === stages.length - 1;
          return (
            <div key={f.stage}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--vellum)',
                  }}
                >
                  {f.stage}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--lantern)',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  {f.count.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'rgba(232, 213, 165, 0.12)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(f.count / max) * 100}%`,
                    height: '100%',
                    background: last ? 'var(--verdigris)' : 'var(--lantern)',
                    boxShadow: `0 0 10px ${last ? 'var(--verdigris)' : 'var(--glow)'}`,
                  }}
                />
              </div>
              {rate !== null && (
                <div
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.2,
                    color: 'var(--vellum-shadow)',
                    marginTop: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {rate}% carried forward
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EnvelopeCard>
  );
}

function ActivityFeed({
  activity,
}: {
  readonly activity: DashboardStudioData['activity'];
}): React.JSX.Element {
  return (
    <VellumCard>
      <Kicker>what&rsquo;s happening</Kicker>
      {activity.length === 0 ? (
        <p className="body-italic" style={{ marginTop: 14, color: 'var(--ink-quiet)' }}>
          nothing new this hour. the ink is still drying.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
          {activity.map((a) => (
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
              <span style={{ color: 'var(--gilt-deep)', fontSize: 18 }}>{a.icon}</span>
              <span className="body" style={{ flex: 1 }}>
                {a.text}
              </span>
              <span style={{ color: 'var(--ink-quiet)', fontSize: 13 }}>{a.when}</span>
            </li>
          ))}
        </ul>
      )}
    </VellumCard>
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
      {loading && <Hand onDark>~ counting ~</Hand>}
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
