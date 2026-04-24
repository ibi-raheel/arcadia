'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';

import { GhostButton, Kicker } from '@/components/scriptorium';

import { renameLesson, updateLessonContent, updateLessonType } from '../actions';
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
  const [typePending, startTypeTransition] = useTransition();

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

  const convertToVideo = (): void => {
    if (
      !window.confirm(
        'Convert to a video lesson? The Markdown content stays saved in the database but is hidden in the video editor.',
      )
    )
      return;
    startTypeTransition(async () => {
      const result = await updateLessonType(courseId, lesson.id, 'video');
      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error });
      } else {
        router.refresh();
      }
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 10,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
        }}
      >
        <div style={{ flex: 1 }}>
          <Kicker>written lesson</Kicker>
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
            style={{
              width: '100%',
              marginTop: 4,
              padding: '2px 0',
              border: 'none',
              borderBottom: '1.5px solid transparent',
              background: 'transparent',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 28,
              color: 'var(--ink)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--lantern)')}
          />
        </div>
        <SaveIndicator status={status} />
        <GhostButton onClick={convertToVideo} disabled={typePending} size="sm">
          convert to video
        </GhostButton>
      </header>

      <div data-color-mode="light" style={{ flex: 1 }}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height={500}
          preview="live"
          visibleDragbar={false}
          textareaProps={{
            maxLength: LESSON_CONTENT_MAX,
            placeholder: 'write your lesson — the keeper&rsquo;s hand…',
          }}
        />
      </div>

      <p
        className="mono"
        style={{ marginTop: 8, textAlign: 'right', color: 'var(--ink-faint)', fontSize: 11 }}
      >
        {content.length.toLocaleString()} / {LESSON_CONTENT_MAX.toLocaleString()}
      </p>
    </section>
  );
}

function SaveIndicator({ status }: { readonly status: SaveStatus }): React.JSX.Element {
  if (status === 'idle') {
    return <span className="hand">~ unsaved ~</span>;
  }
  if (status === 'saving') {
    return (
      <span className="hand" style={{ color: 'var(--lantern-2)' }}>
        ~ saving ~
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="hand" style={{ color: 'var(--verdigris)' }}>
        ~ sealed ~
      </span>
    );
  }
  return (
    <span className="hand" style={{ color: 'var(--crimson)' }}>
      ~ the ink ran: {status.message} ~
    </span>
  );
}
