// `/dashboard/courses` — creator's course list (the kiln). Server
// component; real Supabase reads the courses table and shapes the rows
// into CoursesData so the shared CoursesContent renders.
//
// Extra analytics (revenue, sales, finish rate, lesson perf, reviews)
// aren't in the DB yet — those fields default to 0 / empty and the
// sections hide. Puts the full V4.5 kit surface behind a single page
// without having to wait for Stripe / analytics to land.

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, LedgerCard } from '@/components/scriptorium';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { CourseSummary, CoursesData } from '@/lib/fixtures/courses';
import type { DraftStage } from '@/lib/types/course-drafts';

import { CreateCourseDialog } from '../_components/CreateCourseDialog';
import { ConjureLink } from './_components/ConjureLink';
import { CoursesContent } from './_components/CoursesContent';

export const dynamic = 'force-dynamic';

type DashboardCourse = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly published: boolean;
  readonly updated_at: string;
};

function relativeUpdatedLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function shapeCourses(rows: readonly DashboardCourse[]): CoursesData {
  const courses: CourseSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    kicker: r.description ?? undefined,
    status: r.published ? 'published' : 'draft',
    price: 0,
    lessons: 0,
    sales: 0,
    revenue: 0,
    finishRate: r.published ? 0 : undefined,
    progress: r.published ? undefined : 0,
    updated: relativeUpdatedLabel(r.updated_at),
  }));

  return {
    kpis: {
      totalCourses: courses.length,
      published: courses.filter((c) => c.status === 'published').length,
      revenue30d: 0,
      mrr: 0,
      avgFinish: 0,
    },
    courses,
    // Lesson performance + reviews need analytics the MVP doesn't track
    // yet; ship the sections empty so they hide gracefully until they do.
    lessonPerf: [],
    reviews: [],
  };
}

export default async function CoursesTab(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <></>;

  const [{ data: courses, error }, { data: activeDraft }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, published, updated_at')
      .eq('creator_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('course_drafts')
      .select('stage')
      .eq('creator_id', user.id)
      .neq('stage', 'sealed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const shaped = shapeCourses(courses ?? []);
  const resumeStage = (activeDraft?.stage ?? null) as DraftStage | null;

  return (
    <DashboardShell
      kicker="your courses"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>kiln</em>.
        </>
      }
      tagline="~ publish what&rsquo;s finished, keep what&rsquo;s drying ~"
      actions={
        <>
          <ConjureLink resumeStage={resumeStage} />
          <CreateCourseDialog />
        </>
      }
    >
      {error ? (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>
            Couldn&rsquo;t load your courses: {error.message}
          </p>
        </LedgerCard>
      ) : shaped.courses.length === 0 ? (
        <LedgerCard>
          <p
            className="body-italic"
            style={{ fontSize: 18, color: 'var(--ink)', textAlign: 'center' }}
          >
            no courses yet. light the lantern and write the first.
          </p>
          <Hand>~ the button above opens a fresh scroll ~</Hand>
        </LedgerCard>
      ) : (
        <CoursesContent
          data={shaped}
          createCta={
            <>
              <ConjureLink />
              <CreateCourseDialog />
            </>
          }
        />
      )}
    </DashboardShell>
  );
}
