import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { SectionTree, type SectionRow } from './_components/SectionTree';
import { VideoLessonEditor, type VideoLesson } from './_components/VideoLessonEditor';
import { WrittenLessonEditor, type WrittenLesson } from './_components/WrittenLessonEditor';

export const dynamic = 'force-dynamic';

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  creator_id: string | null;
};

type Params = {
  readonly params: { readonly id: string };
  readonly searchParams?: { readonly lesson?: string };
};

export default async function CourseEditorPage({
  params,
  searchParams,
}: Params): Promise<React.JSX.Element> {
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

  const sectionsWithLessons: SectionRow[] = (sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    sort_order: s.sort_order,
    lessons: (lessons ?? [])
      .filter((l) => l.section_id === s.id)
      .map((l) => ({ id: l.id, title: l.title, type: l.type })),
  }));

  // Resolve the selected lesson (from ?lesson=<id>), guarding that it
  // actually belongs to this course.
  const selectedLessonId = searchParams?.lesson ?? null;
  const selectedLesson = selectedLessonId
    ? await loadSelectedLesson(selectedLessonId, course.id)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Header course={course} />
      <div className="mx-auto grid max-w-6xl grid-cols-[300px_1fr] gap-6 p-6">
        <SectionTree
          courseId={course.id}
          initialSections={sectionsWithLessons}
          selectedLessonId={selectedLessonId}
        />
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          {selectedLesson === null ? (
            <LessonPanePlaceholder hasSections={sectionsWithLessons.length > 0} />
          ) : selectedLesson.type === 'video' ? (
            <VideoLessonEditor
              courseId={course.id}
              lesson={{
                id: selectedLesson.id,
                title: selectedLesson.title,
                youtube_video_id: selectedLesson.youtube_video_id,
              }}
            />
          ) : (
            <WrittenLessonEditor
              courseId={course.id}
              lesson={{
                id: selectedLesson.id,
                title: selectedLesson.title,
                content: selectedLesson.content,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

type SelectedLessonRow =
  | (WrittenLesson & { readonly type: 'written' })
  | (VideoLesson & {
      readonly type: 'video';
    });

async function loadSelectedLesson(
  lessonId: string,
  courseId: string,
): Promise<SelectedLessonRow | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select('id, title, content, youtube_video_id, course_id, type')
    .eq('id', lessonId)
    .maybeSingle<{
      id: string;
      title: string;
      content: string | null;
      youtube_video_id: string | null;
      course_id: string;
      type: 'video' | 'written' | null;
    }>();
  if (!data || data.course_id !== courseId) return null;
  if (data.type === 'video') {
    return {
      type: 'video',
      id: data.id,
      title: data.title,
      youtube_video_id: data.youtube_video_id,
    };
  }
  // Default to written for null/written — matches createLesson default.
  return {
    type: 'written',
    id: data.id,
    title: data.title,
    content: data.content,
  };
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

function LessonPanePlaceholder({
  hasSections,
}: {
  readonly hasSections: boolean;
}): React.JSX.Element {
  return (
    <div className="p-6 text-center">
      {hasSections ? (
        <p className="text-slate-400">
          Select a lesson from the left rail to edit it here. Video lessons (YouTube) land in Step
          8.
        </p>
      ) : (
        <div>
          <p className="text-slate-300">This course has no sections yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Add one from the left rail to start authoring lessons.
          </p>
        </div>
      )}
    </div>
  );
}
