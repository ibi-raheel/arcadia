import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  creator_id: string | null;
};

type Section = {
  id: string;
  title: string;
  sort_order: number;
};

type Lesson = {
  id: string;
  section_id: string;
  title: string;
  type: 'video' | 'written' | null;
  sort_order: number;
  is_preview: boolean;
};

type Params = { readonly params: { readonly id: string } };

export default async function CourseEditorPage({ params }: Params): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/courses/${params.id}`);

  // Course: only visible to its creator (RLS clause handles this). A
  // missing row could mean "doesn't exist" or "not yours" — 404 either way.
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, published, creator_id')
    .eq('id', params.id)
    .maybeSingle<Course>();
  if (!course) notFound();

  // Sections ordered by sort_order asc, with their lessons grouped.
  const { data: sections = [] } = await supabase
    .from('sections')
    .select('id, title, sort_order')
    .eq('course_id', params.id)
    .order('sort_order', { ascending: true });

  const { data: lessons = [] } = await supabase
    .from('lessons')
    .select('id, section_id, title, type, sort_order, is_preview')
    .eq('course_id', params.id)
    .order('sort_order', { ascending: true });

  const sectionsWithLessons = (sections ?? []).map((s) => ({
    ...s,
    lessons: (lessons ?? []).filter((l) => l.section_id === s.id),
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Header course={course} />
      <div className="mx-auto grid max-w-6xl grid-cols-[300px_1fr] gap-6 p-6">
        <SectionTree sections={sectionsWithLessons} />
        <LessonPane hasSections={sectionsWithLessons.length > 0} />
      </div>
    </main>
  );
}

function Header({ course }: { readonly course: Course }): React.JSX.Element {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-lg font-semibold">{course.title}</h1>
          <PublishedBadge published={course.published} />
        </div>
        {/* Publish toggle + section add buttons land in Steps 5/10. */}
      </div>
    </header>
  );
}

function PublishedBadge({ published }: { readonly published: boolean }): React.JSX.Element {
  return published ? (
    <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-medium text-emerald-300">
      Published
    </span>
  ) : (
    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
      Draft
    </span>
  );
}

type SectionWithLessons = Section & { readonly lessons: readonly Lesson[] };

function SectionTree({
  sections,
}: {
  readonly sections: readonly SectionWithLessons[];
}): React.JSX.Element {
  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Sections
        </h2>
        <button
          type="button"
          disabled
          title="Coming in Step 5"
          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-500 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </div>
      {sections.length === 0 ? (
        <p className="text-sm text-slate-500">
          No sections yet. Section + lesson CRUD lands in Step 5.
        </p>
      ) : (
        <ol className="space-y-3">
          {sections.map((s) => (
            <li key={s.id}>
              <div className="text-sm font-medium text-slate-200">{s.title}</div>
              {s.lessons.length === 0 ? (
                <p className="pl-3 text-xs text-slate-500">No lessons yet.</p>
              ) : (
                <ul className="mt-1 space-y-1 pl-3">
                  {s.lessons.map((l) => (
                    <li key={l.id} className="text-xs text-slate-400">
                      {l.type === 'video' ? '▶' : '✎'} {l.title}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function LessonPane({ hasSections }: { readonly hasSections: boolean }): React.JSX.Element {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center">
      {hasSections ? (
        <p className="text-slate-400">
          Select a lesson from the left rail to edit. Inline editors come in Steps 7 (Markdown) and
          8 (YouTube URL parser).
        </p>
      ) : (
        <div>
          <p className="text-slate-300">This course has no sections yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Add one from the left rail (wired in Step 5) to start authoring lessons.
          </p>
        </div>
      )}
    </section>
  );
}
