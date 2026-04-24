'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { VideoLessonViewer } from '@/app/academy/[courseId]/_components/VideoLessonViewer';
import { WrittenLessonViewer } from '@/app/academy/[courseId]/_components/WrittenLessonViewer';

import { enrolInCourse } from '../actions';

export type StallLesson = {
  readonly id: string;
  readonly sectionId: string;
  readonly title: string;
  readonly type: 'video' | 'written' | null;
  readonly isPreview: boolean;
  readonly youtubeVideoId: string | null;
  readonly content: string | null;
  readonly durationSec: number | null;
};

export type StallSection = {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly StallLesson[];
};

export type StallData = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly creatorName: string;
  readonly enrolmentCount: number;
  readonly enrolled: boolean;
  readonly sections: readonly StallSection[];
};

type Props = {
  readonly stall: StallData;
  readonly onClose: () => void;
  /**
   * Called after a successful enrolment. The parent tracks session-local
   * enrolment so re-opening the modal still reads as enrolled (Phase 7
   * item M6). `stall.enrolled` only updates on a full page reload.
   */
  readonly onEnrolled?: (courseId: string) => void;
};

export function StallView({ stall, onClose, onEnrolled }: Props): React.JSX.Element {
  const router = useRouter();
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEnrolled = stall.enrolled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activePreview = stall.sections
    .flatMap((s) => s.lessons)
    .find((l) => l.id === activePreviewId);

  const handleEnrol = (): void => {
    setEnrolError(null);
    startTransition(async () => {
      const result = await enrolInCourse(stall.id);
      if (!result.ok) {
        setEnrolError(result.error);
      } else {
        // Stay in the Market — don't redirect or refresh. The parent's
        // session-local enrolled set flips the prop on subsequent opens.
        onEnrolled?.(stall.id);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stall-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          ✕
        </button>

        <header className="border-b border-slate-800 pb-4">
          <h2 id="stall-title" className="text-2xl font-semibold text-slate-100">
            {stall.title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">by {stall.creatorName}</p>
          {stall.description && <p className="mt-3 text-sm text-slate-300">{stall.description}</p>}
          <p className="mt-3 text-xs text-slate-500">
            {stall.enrolmentCount} enrolled ·{' '}
            {stall.sections.reduce((sum, s) => sum + s.lessons.length, 0)} lessons
          </p>
        </header>

        <section className="mt-4 space-y-4">
          {stall.sections.length === 0 ? (
            <p className="text-sm text-slate-500">This course has no content yet.</p>
          ) : (
            stall.sections.map((s) => (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                <ul className="mt-2 space-y-1">
                  {s.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">{l.type === 'video' ? '▶' : '✎'}</span>
                      <span className="flex-1 truncate text-slate-300">{l.title}</span>
                      {l.isPreview ? (
                        <button
                          type="button"
                          onClick={() => setActivePreviewId(activePreviewId === l.id ? null : l.id)}
                          className="rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-800/70"
                        >
                          {activePreviewId === l.id ? 'Hide preview' : '✓ Preview'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600">Locked</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {activePreview && (
          <section className="mt-6 rounded-lg border border-emerald-900/60 bg-slate-900/60 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Preview: {activePreview.title}
            </h4>
            {activePreview.type === 'video' && activePreview.youtubeVideoId ? (
              <VideoLessonViewer
                previewOnly
                initial={{
                  lessonId: activePreview.id,
                  videoId: activePreview.youtubeVideoId,
                  startSec: 0,
                  durationSec: activePreview.durationSec,
                }}
              />
            ) : activePreview.content ? (
              <WrittenLessonViewer
                previewOnly
                lessonId={activePreview.id}
                content={activePreview.content}
                initiallyCompleted={false}
              />
            ) : (
              <p className="text-sm text-slate-500">Nothing to show yet.</p>
            )}
          </section>
        )}

        <footer className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-300">Free while in beta</span> — no payment
            today.
          </p>
          {isEnrolled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Keep browsing
              </button>
              <button
                type="button"
                onClick={() => router.push(`/academy/${stall.id}`)}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Open in Academy
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {enrolError && <span className="text-xs text-red-300">{enrolError}</span>}
              <button
                type="button"
                onClick={handleEnrol}
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {pending ? 'Enrolling…' : 'Enrol'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
