import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
};

type Lesson = {
  id: string;
  section_id: string;
  title: string;
  type: 'video' | 'written' | null;
  sort_order: number;
};

type SelectedLesson = Lesson & {
  content: string | null;
  youtube_video_id: string | null;
};

type Params = {
  readonly params: { readonly courseId: string };
  readonly searchParams?: { readonly lesson?: string };
};

export default async function CourseViewerPage({
  params,
  searchParams,
}: Params): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/academy/${params.courseId}`);

  // RLS enforces the read gate: published in realm OR creator_id = me OR
  // (for lessons specifically, the enrolment clause too). A missing row
  // from the caller's perspective = 404.
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, published')
    .eq('id', params.courseId)
    .maybeSingle<Course>();
  if (!course) notFound();

  const [{ data: sections }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase
      .from('sections')
      .select('id, title, sort_order')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, section_id, title, type, sort_order')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed, watched_secs')
      .eq('member_id', user.id),
  ]);

  const completedSet = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));

  const totalLessons = lessons?.length ?? 0;
  const completedLessons = (lessons ?? []).filter((l) => completedSet.has(l.id)).length;

  const groupedSections = (sections ?? []).map((s) => ({
    ...s,
    lessons: (lessons ?? []).filter((l) => l.section_id === s.id),
  }));

  const selectedLessonId = searchParams?.lesson ?? null;
  const selectedLesson = selectedLessonId
    ? await loadSelectedLesson(selectedLessonId, params.courseId)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/academy"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              ← Academy
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-lg font-semibold">{course.title}</h1>
          </div>
          <CourseProgress completed={completedLessons} total={totalLessons} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-[300px_1fr] gap-6 p-6">
        <aside className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          {course.description && (
            <p className="mb-4 text-sm text-slate-400">{course.description}</p>
          )}
          {groupedSections.length === 0 ? (
            <p className="text-sm text-slate-500">This course has no content yet.</p>
          ) : (
            <ol className="space-y-4">
              {groupedSections.map((s) => (
                <li key={s.id}>
                  <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                  <ul className="mt-2 space-y-1">
                    {s.lessons.map((l) => (
                      <li key={l.id}>
                        <LessonRow
                          courseId={course.id}
                          lesson={l}
                          completed={completedSet.has(l.id)}
                          selected={l.id === selectedLessonId}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <section className="min-h-[500px] rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          {selectedLesson ? (
            <LessonPlaceholder lesson={selectedLesson} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">
              Select a lesson from the left rail to start.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function loadSelectedLesson(
  lessonId: string,
  courseId: string,
): Promise<SelectedLesson | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select('id, section_id, title, type, sort_order, content, youtube_video_id, course_id')
    .eq('id', lessonId)
    .maybeSingle<SelectedLesson & { course_id: string }>();
  if (!data || data.course_id !== courseId) return null;
  return data;
}

function LessonRow({
  courseId,
  lesson,
  completed,
  selected,
}: {
  readonly courseId: string;
  readonly lesson: Lesson;
  readonly completed: boolean;
  readonly selected: boolean;
}): React.JSX.Element {
  const icon = lesson.type === 'video' ? '▶' : '✎';
  return (
    <Link
      href={`/academy/${courseId}?lesson=${lesson.id}`}
      scroll={false}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
        selected
          ? 'bg-slate-800 text-emerald-200'
          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
      }`}
    >
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1 truncate">{lesson.title}</span>
      {completed && <span className="text-emerald-400">✓</span>}
    </Link>
  );
}

function CourseProgress({
  completed,
  total,
}: {
  readonly completed: number;
  readonly total: number;
}): React.JSX.Element {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">
        {completed}/{total}
      </span>
    </div>
  );
}

// Step 13 replaces this with a real YouTube IFrame Player; Step 15
// replaces the written branch with react-markdown rendering.
function LessonPlaceholder({ lesson }: { readonly lesson: SelectedLesson }): React.JSX.Element {
  return (
    <div>
      <h2 className="text-xl font-semibold">{lesson.title}</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
        {lesson.type ?? 'written'} lesson
      </p>
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-6">
        {lesson.type === 'video' && lesson.youtube_video_id ? (
          <p className="text-sm text-slate-400">
            Video player lands in Step 13. Stored id:{' '}
            <span className="font-mono text-slate-300">{lesson.youtube_video_id}</span>
          </p>
        ) : lesson.content ? (
          <pre className="whitespace-pre-wrap text-sm text-slate-300">{lesson.content}</pre>
        ) : (
          <p className="text-sm text-slate-500">Nothing to show yet.</p>
        )}
      </div>
    </div>
  );
}
