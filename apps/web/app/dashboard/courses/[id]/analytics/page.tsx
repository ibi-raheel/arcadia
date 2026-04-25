// `/dashboard/courses/[id]/analytics` — keeper's tally for one course.
// Reskinned under the Phase-8 scriptorium: EnvelopeCards for KPIs, a
// JournalCard with a hand-drawn SVG sparkline of activity, a
// LedgerCard table of recent progress events. DashboardShell supplies
// the tab nav + simulation toggle.
//
// The real data shape comes from existing fetchCourseAnalytics +
// aggregate helpers (Phase 5 polish). Server component; the shell
// itself handles client bits downstream.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Chip,
  EnvelopeCard,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  JournalCard,
} from '@/components/scriptorium';
import { bucketTimestamps, buildSparkline } from '@/lib/charts/sparkline';
import { getSupabaseServerClient } from '@/lib/supabase/server';

import { fetchCourseAnalytics } from './fetch';

export const dynamic = 'force-dynamic';

type Params = { readonly params: Promise<{ readonly id: string }> };

export default async function CourseAnalyticsPage({ params }: Params): Promise<React.JSX.Element> {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/courses/${id}/analytics`);

  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', id)
    .maybeSingle<{ id: string; title: string }>();

  const result = await fetchCourseAnalytics(id);
  if (!result.ok) {
    if (result.status === 'unauthorized' || result.status === 'not-found') notFound();
    return (
      <DashboardShell
        kicker={course?.title ?? 'a course'}
        title="the keeper's tally"
        tagline="~ the ink ran ~"
      >
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {result.error}</p>
        </LedgerCard>
      </DashboardShell>
    );
  }

  const { enrolmentCount, completionRate, activeInLastWeek, recentActivity } = result.data;

  // Sparkline over the last 14 days, one bucket per day. `recentActivity`
  // already filters to the last ~2 weeks from fetch.ts; build from its
  // timestamps.
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const series = bucketTimestamps(
    recentActivity.map((r) => r.updatedAt),
    twoWeeksAgo.toISOString(),
    now.toISOString(),
    14,
  );
  const hasActivity = series.some((n) => n > 0);

  return (
    <DashboardShell
      kicker={course?.title ?? 'a course'}
      title={
        <>
          the keeper&rsquo;s <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>tally</em>
          .
        </>
      }
      tagline="~ who's read, who's stayed, who's gone quiet ~"
      actions={
        <Link href={`/dashboard/courses/${id}`} style={{ textDecoration: 'none' }}>
          <GhostButton onDark>← editor</GhostButton>
        </Link>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <Kpi label="enrolments" value={String(enrolmentCount)} hint="total folk" />
        <Kpi
          label="completion"
          value={`${Math.round(completionRate * 100)}%`}
          hint="finished every lesson"
        />
        <Kpi label="active · 7d" value={String(activeInLastWeek)} hint="seen in a week" />
      </div>

      <JournalCard style={{ marginBottom: 22 }}>
        <Kicker>activity · last fourteen days</Kicker>
        {hasActivity ? (
          <div style={{ marginTop: 12 }}>
            <ActivitySparkline series={series} />
          </div>
        ) : (
          <p className="body-italic" style={{ marginTop: 12, color: 'var(--ink-soft)' }}>
            no progress events yet. the ink is still drying on this page.
          </p>
        )}
      </JournalCard>

      <LedgerCard>
        <Kicker>recent activity</Kicker>
        {recentActivity.length === 0 ? (
          <p className="body-italic" style={{ marginTop: 12, color: 'var(--ink-soft)' }}>
            Once members start watching lessons, their activity appears here.
          </p>
        ) : (
          <ActivityTable rows={recentActivity} />
        )}
      </LedgerCard>
    </DashboardShell>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}): React.JSX.Element {
  return (
    <EnvelopeCard>
      <Kicker>{label}</Kicker>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 38,
          color: 'var(--vellum)',
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <Hand onDark>{`~ ${hint} ~`}</Hand>
    </EnvelopeCard>
  );
}

function ActivitySparkline({ series }: { readonly series: readonly number[] }): React.JSX.Element {
  const { line, area, viewBox, last } = buildSparkline([...series], { width: 600, height: 90 });
  return (
    <svg viewBox={viewBox} width="100%" height={90} preserveAspectRatio="none">
      <path d={area} fill="rgba(143,37,48,0.12)" />
      <path
        d={line}
        fill="none"
        stroke="var(--wax)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={3.5} fill="var(--wax)" />
    </svg>
  );
}

type ActivityRow = {
  readonly memberId: string;
  readonly lessonId: string;
  readonly updatedAt: string;
  readonly displayName: string;
  readonly lessonTitle: string;
  readonly completed: boolean;
};

function ActivityTable({ rows }: { readonly rows: readonly ActivityRow[] }): React.JSX.Element {
  return (
    <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th>member</Th>
          <Th>lesson</Th>
          <Th>status</Th>
          <Th>when</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.memberId}-${row.lessonId}-${row.updatedAt}`}
            style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}
          >
            <Td>
              <span style={{ color: 'var(--ink)' }}>{row.displayName}</span>
            </Td>
            <Td>
              <span style={{ color: 'var(--ink-soft)' }}>{row.lessonTitle}</span>
            </Td>
            <Td>
              {row.completed ? (
                <Chip variant="verdigris">sealed</Chip>
              ) : (
                <Chip variant="bronze">reading</Chip>
              )}
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-soft)' }}>
                {new Date(row.updatedAt).toLocaleString()}
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
        padding: '8px 10px',
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

function Td({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <td
      style={{
        padding: '10px',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
      }}
    >
      {children}
    </td>
  );
}
