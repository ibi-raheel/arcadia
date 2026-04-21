'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';

import { renameLesson, updateLessonContent } from '../actions';
import { LESSON_CONTENT_MAX, LESSON_TITLE_MAX } from '../validation';

// @uiw/react-md-editor ships browser-only — dynamic import skips SSR,
// matching the pattern used by GameWorld / GameTavern.
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

const AUTOSAVE_DEBOUNCE_MS = 2000;

export type WrittenLesson = {
  readonly id: string;
  readonly title: string;
  readonly content: string | null;
};

type Props = {
  readonly courseId: string;
  readonly lesson: WrittenLesson;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | { kind: 'error'; message: string };

export function WrittenLessonEditor({ courseId, lesson }: Props): React.JSX.Element {
  const router = useRouter();
  const [content, setContent] = useState<string>(lesson.content ?? '');
  const [title, setTitle] = useState<string>(lesson.title);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [titlePending, startTitleTransition] = useTransition();

  const saveTimer = useRef<number | null>(null);
  const latestContent = useRef<string>(content);

  // When the selected lesson changes (different ?lesson= in the URL),
  // reset local state from the new prop.
  useEffect(() => {
    setContent(lesson.content ?? '');
    setTitle(lesson.title);
    setStatus('idle');
    latestContent.current = lesson.content ?? '';
  }, [lesson.id, lesson.title, lesson.content]);

  const flush = useCallback(async () => {
    setStatus('saving');
    const toSend = latestContent.current;
    const result = await updateLessonContent(courseId, lesson.id, toSend);
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error });
    } else {
      setStatus('saved');
    }
  }, [courseId, lesson.id]);

  // Debounced autosave. Each content change resets the timer; on the
  // trailing edge, we call flush(). Unmount / lesson-switch also flushes
  // any pending change so no keystroke is lost.
  useEffect(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flush();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [content, flush]);

  useEffect(() => {
    // Best-effort flush on unmount / lesson-switch — fire-and-forget.
    // `latestContent.current` always reads the most recent keystroke.
    const courseIdAtMount = courseId;
    const lessonIdAtMount = lesson.id;
    const originalContent = lesson.content ?? '';
    return () => {
      if (latestContent.current !== originalContent) {
        void updateLessonContent(courseIdAtMount, lessonIdAtMount, latestContent.current);
      }
    };
  }, [courseId, lesson.id, lesson.content]);

  const handleContentChange = (value?: string): void => {
    const next = value ?? '';
    setContent(next);
    latestContent.current = next;
    setStatus('idle');
  };

  const commitTitle = (): void => {
    if (title.trim() === lesson.title) return;
    startTitleTransition(async () => {
      const result = await renameLesson(courseId, lesson.id, title);
      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error });
        setTitle(lesson.title);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <section className="flex h-full flex-col">
      <header className="mb-4 flex items-center justify-between gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, LESSON_TITLE_MAX))}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={titlePending}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold text-slate-100 hover:border-slate-800 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none"
        />
        <SaveIndicator status={status} />
      </header>

      <div data-color-mode="dark" className="flex-1">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height={500}
          preview="live"
          visibleDragbar={false}
          textareaProps={{ maxLength: LESSON_CONTENT_MAX, placeholder: 'Write your lesson…' }}
        />
      </div>

      <p className="mt-2 text-right text-xs text-slate-500">
        {content.length.toLocaleString()}/{LESSON_CONTENT_MAX.toLocaleString()}
      </p>
    </section>
  );
}

function SaveIndicator({ status }: { readonly status: SaveStatus }): React.JSX.Element {
  if (status === 'idle') {
    return <span className="text-xs text-slate-600">Unsaved changes</span>;
  }
  if (status === 'saving') {
    return <span className="text-xs text-amber-400">Saving…</span>;
  }
  if (status === 'saved') {
    return <span className="text-xs text-emerald-400">Saved</span>;
  }
  return <span className="text-xs text-red-400">Save failed: {status.message}</span>;
}
