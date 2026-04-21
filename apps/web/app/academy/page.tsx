import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { BuildingTransition } from '@/components/game/BuildingTransition';

export const dynamic = 'force-dynamic';

type AcademyCourse = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published: boolean;
  creator_id: string | null;
};

type AcademyCourseWithProgress = AcademyCourse & {
  totalLessons: number;
  completedLessons: number;
};

export default async function AcademyPage(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/academy');

  const [{ data: enrolments }, { data: owned }, { data: progress }] = await Promise.all([
    supabase
      .from('enrolments')
      .select('course_id, courses(id, title, description, thumbnail_url, published, creator_id)')
      .eq('member_id', user.id),
    supabase
      .from('courses')
      .select('id, title, description, thumbnail_url, published, creator_id')
      .eq('creator_id', user.id)
      .eq('published', true),
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed, lessons(course_id)')
      .eq('member_id', user.id),
  ]);

  // Merge enrolled + owned-published courses into a unique set. An unpublished
  // course a member enrolled in can't be deliver-read anyway (lessons RLS
  // blocks content on non-preview lessons for a non-creator/non-enrolled
  // combo), but even then /academy is a "published library" surface.
  const byId = new Map<string, AcademyCourse>();
  for (const e of enrolments ?? []) {
    const c = (e as { courses: AcademyCourse | AcademyCourse[] | null }).courses;
    const row = Array.isArray(c) ? c[0] : c;
    if (row && row.published) byId.set(row.id, row);
  }
  for (const c of owned ?? []) byId.set(c.id, c as AcademyCourse);
  const courses = Array.from(byId.values());

  // Count total + completed lessons per course (naive N queries replaced
  // with one server-side aggregation).
  const { data: lessonCounts } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courses.length > 0 ? courses.map((c) => c.id) : ['']);

  const totalByCourse = new Map<string, number>();
  for (const l of lessonCounts ?? []) {
    totalByCourse.set(l.course_id, (totalByCourse.get(l.course_id) ?? 0) + 1);
  }

  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id),
  );
  const completedByCourse = new Map<string, number>();
  for (const l of lessonCounts ?? []) {
    if (completedLessonIds.has(l.id)) {
      completedByCourse.set(l.course_id, (completedByCourse.get(l.course_id) ?? 0) + 1);
    }
  }

  const rows: AcademyCourseWithProgress[] = courses.map((c) => ({
    ...c,
    totalLessons: totalByCourse.get(c.id) ?? 0,
    completedLessons: completedByCourse.get(c.id) ?? 0,
  }));

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">The Academy</h1>
              <p className="mt-1 text-sm text-slate-400">Your courses across this realm.</p>
            </div>
            <Link
              href="/world"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
            >
              ← Back to World
            </Link>
          </header>

          {rows.length > 0 ? <CourseGrid rows={rows} /> : <EmptyState />}
        </div>
      </main>
      <BuildingTransition building="academy" ready />
    </>
  );
}

function CourseGrid({
  rows,
}: {
  readonly rows: readonly AcademyCourseWithProgress[];
}): React.JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <li key={c.id}>
          <Link
            href={`/academy/${c.id}`}
            className="block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-emerald-500"
          >
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="aspect-video w-full bg-slate-800/60" />
            )}
            <div className="p-5">
              <h2 className="text-lg font-medium text-slate-100">{c.title}</h2>
              {c.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{c.description}</p>
              )}
              <ProgressBar total={c.totalLessons} completed={c.completedLessons} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProgressBar({
  total,
  completed,
}: {
  readonly total: number;
  readonly completed: number;
}): React.JSX.Element {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {completed}/{total} lessons
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
      <p className="text-lg text-slate-300">No courses in your library yet.</p>
      <p className="mt-2 text-sm text-slate-500">
        Enrol in a course from the Market, or ask a creator to grant you access.
      </p>
    </div>
  );
}
