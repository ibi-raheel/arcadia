// `/academy/[courseId]` — member course viewer. Night-room + desk frame,
// ledger-card rail on the left, a scroll/vellum page on the right. The
// interactive viewers (VideoLessonViewer, WrittenLessonViewer) keep their
// own client-side progress wiring; only the chrome changed in 8.5.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  Desk,
  DeskOrnaments,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  NightRoom,
  ScrollCard,
  VellumCard,
} from '@/components/scriptorium';
import { getSupabaseServerClient } from '@/lib/supabase/server';

import { VideoLessonViewer } from './_components/VideoLessonViewer';
import { WrittenLessonViewer } from './_components/WrittenLessonViewer';

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
  duration_sec: number | null;
};

type Params = {
  readonly params: { readonly courseId: string };
  readonly searchParams?: { readonly lesson?: string };
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

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

  const selectedProgress =
    selectedLessonId && progress ? progress.find((p) => p.lesson_id === selectedLessonId) : null;
  const startSec = selectedProgress?.watched_secs ?? 0;

  const firstLetter = course.title.charAt(0).toUpperCase() || 'A';

  return (
    <NightRoom>
      <Desk>
        <DeskOrnaments />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1180,
            margin: '0 auto',
            padding: '30px 28px 48px',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flex: 1 }}>
              <DropCap letter={firstLetter} variant="blue" />
              <div style={{ flex: 1 }}>
                <Link href="/academy" style={{ textDecoration: 'none' }}>
                  <GhostButton size="sm" onDark>
                    ← the academy
                  </GhostButton>
                </Link>
                <div style={{ marginTop: 10 }}>
                  <Kicker onDark>a lesson, under lantern</Kicker>
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 42,
                    lineHeight: 1.1,
                    color: 'var(--vellum)',
                    margin: '6px 0 4px',
                  }}
                >
                  {course.title}
                </h1>
                {course.description && <Hand onDark>{`~ ${course.description} ~`}</Hand>}
              </div>
            </div>
            <CourseProgress completed={completedLessons} total={totalLessons} />
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: 22,
              alignItems: 'start',
            }}
          >
            <LedgerCard style={{ padding: '22px 20px' }}>
              <Kicker>the chapters</Kicker>
              {groupedSections.length === 0 ? (
                <p className="body-italic" style={{ marginTop: 10, color: 'var(--ink-soft)' }}>
                  ~ nothing inked yet ~
                </p>
              ) : (
                <ol
                  style={{
                    listStyle: 'none',
                    margin: '14px 0 0',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                  }}
                >
                  {groupedSections.map((s, i) => (
                    <li key={s.id}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 8,
                          paddingBottom: 6,
                          borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
                        }}
                      >
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: 1.8,
                            color: 'var(--bronze-deep)',
                            minWidth: 22,
                            fontWeight: 500,
                          }}
                        >
                          {ROMAN[i] ?? `${i + 1}`}
                        </span>
                        <h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontSize: 19,
                            color: 'var(--ink)',
                            margin: 0,
                            flex: 1,
                          }}
                        >
                          {s.title}
                        </h3>
                        <SectionCount
                          completed={s.lessons.filter((l) => completedSet.has(l.id)).length}
                          total={s.lessons.length}
                        />
                      </div>
                      <ul
                        style={{
                          listStyle: 'none',
                          margin: '8px 0 0',
                          padding: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        {s.lessons.length === 0 ? (
                          <li
                            className="body-italic"
                            style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '4px 8px' }}
                          >
                            no lessons yet
                          </li>
                        ) : (
                          s.lessons.map((l) => (
                            <li key={l.id}>
                              <LessonRow
                                courseId={course.id}
                                lesson={l}
                                completed={completedSet.has(l.id)}
                                selected={l.id === selectedLessonId}
                              />
                            </li>
                          ))
                        )}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </LedgerCard>

            <div>
              {selectedLesson === null ? (
                <ScrollCard>
                  <div style={{ padding: '32px 8px', textAlign: 'center' }}>
                    <Kicker>no page turned</Kicker>
                    <p className="body-italic" style={{ marginTop: 12, color: 'var(--ink-soft)' }}>
                      Pick a lesson from the chapters on the left to begin.
                    </p>
                    <Hand>~ the scribe is ready ~</Hand>
                  </div>
                </ScrollCard>
              ) : (
                <LessonBody
                  lesson={selectedLesson}
                  startSec={startSec}
                  completed={completedSet.has(selectedLesson.id)}
                />
              )}
            </div>
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}

async function loadSelectedLesson(
  lessonId: string,
  courseId: string,
): Promise<SelectedLesson | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select(
      'id, section_id, title, type, sort_order, content, youtube_video_id, duration_sec, course_id',
    )
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 10px 10px 14px',
        borderRadius: 2,
        textDecoration: 'none',
        fontSize: 14,
        lineHeight: 1.3,
        color: selected ? 'var(--ink)' : 'var(--ink-soft)',
        background: selected ? 'rgba(201, 138, 58, 0.18)' : 'transparent',
        borderLeft: selected ? '3px solid var(--bronze)' : '3px solid transparent',
        fontWeight: selected ? 500 : 400,
        transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
      }}
    >
      <span
        style={{
          color: selected ? 'var(--bronze-deep)' : 'var(--ink-faint)',
          fontSize: 12,
          width: 14,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {lesson.title}
      </span>
      {completed && (
        <span
          style={{
            color: 'var(--verdigris-2)',
            fontSize: 13,
            flexShrink: 0,
          }}
          aria-label="completed"
        >
          ✓
        </span>
      )}
    </Link>
  );
}

function SectionCount({
  completed,
  total,
}: {
  readonly completed: number;
  readonly total: number;
}): React.JSX.Element | null {
  if (total === 0) return null;
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: 1.2,
        color: completed === total ? 'var(--verdigris-2)' : 'var(--ink-faint)',
      }}
    >
      {completed}/{total}
    </span>
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        minWidth: 200,
      }}
    >
      <Kicker onDark>progress</Kicker>
      <div
        style={{
          width: 200,
          height: 8,
          borderRadius: 4,
          background: 'rgba(232, 213, 165, 0.14)',
          border: '1px solid rgba(138, 106, 58, 0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background:
              'linear-gradient(90deg, var(--bronze) 0%, var(--lantern) 60%, var(--gilt) 100%)',
            transition: 'width 240ms ease',
          }}
        />
      </div>
      <span className="mono" style={{ color: 'var(--vellum-2)', fontSize: 11 }}>
        {completed}/{total} · {pct}%
      </span>
    </div>
  );
}

function LessonBody({
  lesson,
  startSec,
  completed,
}: {
  readonly lesson: SelectedLesson;
  readonly startSec: number;
  readonly completed: boolean;
}): React.JSX.Element {
  const isVideo = lesson.type === 'video' && lesson.youtube_video_id;
  const Shell = isVideo ? VellumCard : ScrollCard;
  return (
    <Shell>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 10,
          marginBottom: 16,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
        }}
      >
        <div>
          <Kicker>{isVideo ? 'video lesson' : 'written lesson'}</Kicker>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 28,
              color: 'var(--ink)',
              margin: '4px 0 0',
            }}
          >
            {lesson.title}
          </h2>
        </div>
        {completed && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--verdigris-2)',
              fontFamily: 'var(--font-caps)',
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            ✓ signed
          </span>
        )}
      </header>
      {isVideo ? (
        <VideoLessonViewer
          initial={{
            lessonId: lesson.id,
            videoId: lesson.youtube_video_id!,
            startSec,
            durationSec: lesson.duration_sec,
          }}
        />
      ) : lesson.content ? (
        <WrittenLessonViewer
          lessonId={lesson.id}
          content={lesson.content}
          initiallyCompleted={completed}
        />
      ) : (
        <p className="body-italic" style={{ color: 'var(--ink-soft)' }}>
          ~ nothing inked on this page yet ~
        </p>
      )}
    </Shell>
  );
}
