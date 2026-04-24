import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Chip, GhostButton, WaxSeal } from '@/components/scriptorium';
import { getSupabaseServerClient } from '@/lib/supabase/server';

import { PublishToggle } from './_components/PublishToggle';
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
    <DashboardShell
      kicker={course.published ? 'signed · published' : 'drying · draft'}
      title={course.title}
      tagline={course.description ?? undefined}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {course.published ? <WaxSeal letter="P" /> : <Chip>draft</Chip>}
          <Link
            href={`/dashboard/courses/${course.id}/analytics`}
            style={{ textDecoration: 'none' }}
          >
            <GhostButton onDark>analytics →</GhostButton>
          </Link>
          <PublishToggle courseId={course.id} published={course.published} />
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 20,
          color: 'var(--ink)',
        }}
      >
        <SectionTree
          courseId={course.id}
          initialSections={sectionsWithLessons}
          selectedLessonId={selectedLessonId}
        />
        <div
          style={{
            background: 'linear-gradient(180deg, var(--vellum) 0%, var(--vellum-2) 100%)',
            borderRadius: 3,
            padding: 22,
            boxShadow: '0 18px 34px rgba(0,0,0,0.52)',
          }}
        >
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
    </DashboardShell>
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

function LessonPanePlaceholder({
  hasSections,
}: {
  readonly hasSections: boolean;
}): React.JSX.Element {
  return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-soft)' }}>
      {hasSections ? (
        <p className="body-italic">
          Select a lesson from the left rail to edit it here. Video lessons (YouTube) land in Step
          8.
        </p>
      ) : (
        <div>
          <p className="body-italic" style={{ color: 'var(--ink)' }}>
            This course has no sections yet.
          </p>
          <p className="hand" style={{ marginTop: 8 }}>
            ~ add one from the left rail to start authoring ~
          </p>
        </div>
      )}
    </div>
  );
}
