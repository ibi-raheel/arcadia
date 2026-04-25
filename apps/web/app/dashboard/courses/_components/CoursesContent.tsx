// Every visual section of the /dashboard/courses tab, in one shared
// module so the auth-gated production route and the public
// /preview/courses route render identical UI from the same props.
//
// Sections (mirroring the V4.5 kit's Courses.jsx):
//  - CoursesKpis · 5-col strip (total / published / revenue / MRR / avg finish)
//  - Published course cards (2-col grid)
//  - In-the-kiln drafts + review cards (3-col grid)
//  - LessonPerformance · course-selector + per-lesson table
//  - Reviews · recent 5-star reads

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  BarProgress,
  BronzeButton,
  EnvelopeCard,
  Hand,
  Kicker,
  LedgerCard,
  ScrollCard,
  Stat,
  VellumCard,
  WaxSeal,
} from '@/components/scriptorium';
import type {
  CourseLessonStat,
  CoursePerformance,
  CourseReview,
  CourseSummary,
  CoursesData,
  CoursesKpis,
} from '@/lib/fixtures/courses';

type Props = {
  readonly data: CoursesData;
  /** Optional — when absent the page won't render a "new course" CTA. */
  readonly createCta?: React.ReactNode;
};

export function CoursesContent({ data, createCta }: Props): React.JSX.Element {
  const published = data.courses.filter((c) => c.status === 'published');
  const drafts = data.courses.filter((c) => c.status !== 'published');
  return (
    <>
      <CoursesKpiStrip kpis={data.kpis} />

      {published.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <SectionHeader
            kicker="signed · published"
            title="out under your name"
            aside={createCta}
          />
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {published.map((c, i) => (
              <PublishedCourseCard key={c.id} course={c} tilt={i % 2 === 0 ? -0.2 : 0.2} />
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <SectionHeader kicker="drying · in the kiln" title="still warm" />
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {drafts.map((c, i) => (
              <DraftCourseCard key={c.id} course={c} tilt={i % 2 === 0 ? 0.2 : -0.2} />
            ))}
          </div>
        </section>
      )}

      {data.lessonPerf.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <LessonPerformanceCard perfs={data.lessonPerf} />
        </section>
      )}

      {data.reviews.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <ReviewsScroll reviews={data.reviews} />
        </section>
      )}
    </>
  );
}

function SectionHeader({
  kicker,
  title,
  aside,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly aside?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 20,
        marginBottom: 4,
      }}
    >
      <div>
        <Kicker onDark>{kicker}</Kicker>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 30,
            color: 'var(--vellum)',
            margin: '2px 0 0',
            lineHeight: 1,
          }}
        >
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}

function CoursesKpiStrip({ kpis }: { readonly kpis: CoursesKpis }): React.JSX.Element {
  return (
    <LedgerCard style={{ padding: '20px 26px', marginBottom: 22 }} rotate={-0.2}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 20,
        }}
      >
        {[
          { label: 'courses · all', value: kpis.totalCourses },
          { label: 'published', value: kpis.published },
          {
            label: 'revenue · 30d',
            value: `$${kpis.revenue30d.toLocaleString()}`,
          },
          { label: 'recurring · mrr', value: `$${kpis.mrr.toLocaleString()}` },
          { label: 'avg finish', value: `${kpis.avgFinish}%` },
        ].map((item, i) => (
          <div
            key={item.label}
            style={{
              borderLeft: i === 0 ? 'none' : '1px dashed rgba(90, 63, 34, 0.35)',
              paddingLeft: i === 0 ? 0 : 18,
            }}
          >
            <Stat label={item.label} value={item.value} />
          </div>
        ))}
      </div>
    </LedgerCard>
  );
}

function PublishedCourseCard({
  course,
  tilt,
}: {
  readonly course: CourseSummary;
  readonly tilt: number;
}): React.JSX.Element {
  const finish = course.finishRate ?? 0;
  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <VellumCard
        rotate={tilt}
        style={{
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 220,
          cursor: 'pointer',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div>
            {course.kicker && <Kicker>{course.kicker}</Kicker>}
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--ink)',
                margin: '4px 0 0',
                lineHeight: 1.15,
              }}
            >
              {course.title}
            </h3>
            <Hand>~ updated {course.updated} ~</Hand>
          </div>
          <WaxSeal letter="P" />
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
          }}
        >
          <CoursePill label="lessons" value={`${course.lessons}`} />
          <CoursePill label="sales" value={`${course.sales}`} />
          <CoursePill
            label="revenue"
            value={`$${course.revenue.toLocaleString()}`}
            color="var(--oxblood)"
          />
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Kicker>finish rate</Kicker>
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-soft)', letterSpacing: 1.2 }}
            >
              {finish}%
            </span>
          </div>
          <BarProgress pct={finish} color="var(--verdigris)" height={5} />
        </div>
      </VellumCard>
    </Link>
  );
}

function DraftCourseCard({
  course,
  tilt,
}: {
  readonly course: CourseSummary;
  readonly tilt: number;
}): React.JSX.Element {
  const progress = course.progress ?? 0;
  const inReview = course.status === 'review';
  const barColor = inReview ? 'var(--oxblood)' : 'var(--lantern)';
  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <VellumCard
        rotate={tilt}
        style={{
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 200,
          cursor: 'pointer',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            {course.kicker && <Kicker>{course.kicker}</Kicker>}
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 20,
                color: 'var(--ink)',
                margin: '4px 0 0',
                lineHeight: 1.15,
              }}
            >
              {course.title}
            </h3>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: inReview ? 'var(--oxblood)' : 'var(--ink-faint)',
              textTransform: 'uppercase',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {inReview ? '◉ in review' : '✎ draft'}
          </span>
        </header>

        {course.note && (
          <p className="hand" style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
            ~ {course.note} ~
          </p>
        )}

        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Kicker>authored</Kicker>
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-soft)', letterSpacing: 1.2 }}
            >
              {progress}%
            </span>
          </div>
          <BarProgress pct={progress} color={barColor} height={5} />
          <div
            className="mono"
            style={{
              marginTop: 6,
              fontSize: 10,
              letterSpacing: 1.2,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
            }}
          >
            {course.lessons} lessons · updated {course.updated}
          </div>
        </div>
      </VellumCard>
    </Link>
  );
}

function CoursePill({
  label,
  value,
  color = 'var(--ink)',
}: {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}): React.JSX.Element {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 20,
          color,
          lineHeight: 1,
          marginTop: 4,
          fontVariantNumeric: 'oldstyle-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function LessonPerformanceCard({
  perfs,
}: {
  readonly perfs: readonly CoursePerformance[];
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(perfs[0]?.courseId ?? '');
  const selected = useMemo(
    () => perfs.find((p) => p.courseId === selectedId) ?? perfs[0]!,
    [perfs, selectedId],
  );

  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={-0.2}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 14,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Kicker>per lesson · by the minute</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            where they watch and where they walk
          </h3>
        </div>
        {perfs.length > 1 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--ink)',
              background: 'transparent',
              border: '1px dashed var(--bronze-deep)',
              borderRadius: 3,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {perfs.map((p) => (
              <option key={p.courseId} value={p.courseId}>
                {p.courseTitle}
              </option>
            ))}
          </select>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <PerfTh>lesson</PerfTh>
            <PerfTh align="right">avg time</PerfTh>
            <PerfTh align="right">dropoff</PerfTh>
            <PerfTh>watch trail</PerfTh>
          </tr>
        </thead>
        <tbody>
          {selected.lessons.map((l, i) => (
            <LessonRow
              key={l.title}
              lesson={l}
              index={i + 1}
              last={i === selected.lessons.length - 1}
            />
          ))}
        </tbody>
      </table>
    </VellumCard>
  );
}

function LessonRow({
  lesson,
  index,
  last,
}: {
  readonly lesson: CourseLessonStat;
  readonly index: number;
  readonly last: boolean;
}): React.JSX.Element {
  const mins = Math.floor(lesson.avgTimeSec / 60);
  const secs = lesson.avgTimeSec % 60;
  return (
    <tr
      style={{
        borderTop: '1px dashed rgba(90,63,34,0.25)',
        borderBottom: last ? 'none' : '1px dashed rgba(90,63,34,0.1)',
      }}
    >
      <PerfTd>
        <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 11, marginRight: 8 }}>
          {index.toString().padStart(2, '0')}
        </span>
        <span className="body-italic" style={{ color: 'var(--ink)', fontSize: 15 }}>
          {lesson.title}
        </span>
      </PerfTd>
      <PerfTd align="right">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink)',
            fontVariantNumeric: 'oldstyle-nums',
          }}
        >
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </PerfTd>
      <PerfTd align="right">
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: lesson.dropoffPct >= 30 ? 'var(--wax)' : 'var(--ink-faint)',
            fontWeight: lesson.dropoffPct >= 30 ? 500 : 400,
          }}
        >
          {lesson.dropoffPct}%
        </span>
      </PerfTd>
      <PerfTd>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
          <div style={{ flex: 1 }}>
            <BarProgress pct={lesson.watchedPct} color="var(--verdigris)" height={5} />
          </div>
          <span
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink)', letterSpacing: 1.2, minWidth: 32 }}
          >
            {lesson.watchedPct}%
          </span>
        </div>
      </PerfTd>
    </tr>
  );
}

function PerfTh({
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

function PerfTd({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return <td style={{ padding: '12px 10px', textAlign: align, fontSize: 14 }}>{children}</td>;
}

function ReviewsScroll({
  reviews,
}: {
  readonly reviews: readonly CourseReview[];
}): React.JSX.Element {
  return (
    <EnvelopeCard style={{ padding: '22px 26px' }} rotate={0.2}>
      <Kicker onDark>what folk wrote back</Kicker>
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
        recent reviews
      </h3>
      <div
        style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {reviews.map((r) => (
          <div
            key={r.id}
            style={{
              padding: 14,
              borderRadius: 3,
              background: 'rgba(232, 213, 165, 0.06)',
              border: '1px dashed rgba(232, 213, 165, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 30% 25%, var(--bronze-bright) 0%, var(--bronze) 55%, var(--bronze-deep))',
                  color: 'var(--night)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {r.seal}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--vellum)',
                    lineHeight: 1.1,
                  }}
                >
                  {r.reviewer}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.3,
                    color: 'var(--vellum-shadow)',
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  {r.courseTitle} · {r.when}
                </div>
              </div>
              <Stars count={r.stars} />
            </div>
            <p
              className="body-italic"
              style={{
                color: 'var(--vellum)',
                fontSize: 14,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              “{r.body}”
            </p>
          </div>
        ))}
      </div>
    </EnvelopeCard>
  );
}

function Stars({ count }: { readonly count: number }): React.JSX.Element {
  const full = Math.max(0, Math.min(5, Math.round(count)));
  return (
    <span
      aria-label={`${count} stars`}
      style={{
        fontSize: 14,
        letterSpacing: 1,
        color: 'var(--lantern)',
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
      }}
    >
      {'✦'.repeat(full)}
      <span style={{ color: 'rgba(232,213,165,0.25)' }}>{'✦'.repeat(5 - full)}</span>
    </span>
  );
}

// Silenced-prettier export so the module has a stable top-level shape.
// Only CoursesContent is a useful external entry point.
export type { Props as CoursesContentProps };

// Also surface BronzeButton + ScrollCard re-exports for convenience in
// preview pages that want to render the CTA the same way.
export { BronzeButton, ScrollCard };
