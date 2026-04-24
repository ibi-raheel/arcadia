'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { GhostButton, Kicker } from '@/components/scriptorium';

import { renameLesson, updateLessonType, updateLessonYouTubeId } from '../actions';
import { LESSON_TITLE_MAX, parseYouTubeId } from '../validation';

export type VideoLesson = {
  readonly id: string;
  readonly title: string;
  readonly youtube_video_id: string | null;
};

type Props = {
  readonly courseId: string;
  readonly lesson: VideoLesson;
};

export function VideoLessonEditor({ courseId, lesson }: Props): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [titlePending, startTitleTransition] = useTransition();
  const [urlInput, setUrlInput] = useState(
    lesson.youtube_video_id ? `https://youtu.be/${lesson.youtube_video_id}` : '',
  );
  const [videoId, setVideoId] = useState<string | null>(lesson.youtube_video_id);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPending, startUrlTransition] = useTransition();
  const [typePending, startTypeTransition] = useTransition();
  const [typeError, setTypeError] = useState<string | null>(null);

  // Sync when lesson prop changes (switched lessons or server refresh).
  useEffect(() => {
    setTitle(lesson.title);
    setVideoId(lesson.youtube_video_id);
    setUrlInput(lesson.youtube_video_id ? `https://youtu.be/${lesson.youtube_video_id}` : '');
    setUrlError(null);
  }, [lesson.id, lesson.title, lesson.youtube_video_id]);

  const commitTitle = (): void => {
    if (title.trim() === lesson.title) return;
    startTitleTransition(async () => {
      const result = await renameLesson(courseId, lesson.id, title);
      if (!result.ok) {
        setTitle(lesson.title);
      } else {
        router.refresh();
      }
    });
  };

  const saveUrl = (): void => {
    setUrlError(null);
    // Parse client-side first so we can preview before the server round-trip.
    const parsed = parseYouTubeId(urlInput);
    if (urlInput.trim().length > 0 && !parsed) {
      setUrlError('Not a valid YouTube URL or ID.');
      return;
    }
    startUrlTransition(async () => {
      const result = await updateLessonYouTubeId(courseId, lesson.id, urlInput);
      if (!result.ok) {
        setUrlError(result.error);
      } else {
        setVideoId(parsed);
        router.refresh();
      }
    });
  };

  const clearUrl = (): void => {
    if (!videoId) return;
    if (!window.confirm('Remove this video from the lesson?')) return;
    setUrlInput('');
    startUrlTransition(async () => {
      const result = await updateLessonYouTubeId(courseId, lesson.id, '');
      if (!result.ok) setUrlError(result.error);
      else {
        setVideoId(null);
        router.refresh();
      }
    });
  };

  const convertToWritten = (): void => {
    if (!window.confirm('Convert to a written lesson? The YouTube link will be cleared.')) return;
    setTypeError(null);
    startTypeTransition(async () => {
      // Clear the YouTube id first (keeps the DB tidy), then flip type.
      const clear = await updateLessonYouTubeId(courseId, lesson.id, '');
      if (!clear.ok) {
        setTypeError(clear.error);
        return;
      }
      const result = await updateLessonType(courseId, lesson.id, 'written');
      if (!result.ok) setTypeError(result.error);
      else router.refresh();
    });
  };

  const previewId = videoId ?? parseYouTubeId(urlInput);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingBottom: 10,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
        }}
      >
        <div style={{ flex: 1 }}>
          <Kicker>video lesson</Kicker>
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
        <GhostButton onClick={convertToWritten} disabled={typePending} size="sm">
          convert to written
        </GhostButton>
      </header>

      {typeError && (
        <p
          style={{
            padding: '8px 10px',
            background: 'rgba(143, 37, 48, 0.14)',
            border: '1px dashed var(--wax-deep)',
            borderRadius: 3,
            color: 'var(--oxblood)',
            fontSize: 13,
          }}
        >
          {typeError}
        </p>
      )}

      <div
        style={{
          background: 'rgba(232, 213, 165, 0.5)',
          border: '1px dashed rgba(138, 106, 58, 0.4)',
          borderRadius: 3,
          padding: 16,
        }}
      >
        <Kicker>youtube url</Kicker>
        <p className="body-italic" style={{ marginTop: 6, color: 'var(--ink-soft)', fontSize: 13 }}>
          Paste any YouTube share URL (unlisted is fine). We only store the 11-character video id.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://youtu.be/…"
            disabled={urlPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveUrl();
              }
            }}
            className="field"
            style={{ flex: 1, fontSize: 14 }}
          />
          <button
            type="button"
            onClick={saveUrl}
            disabled={urlPending}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              background:
                'linear-gradient(135deg, var(--bronze-bright) 0%, var(--bronze) 45%, var(--bronze-deep) 100%)',
              color: 'var(--night)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 14,
              opacity: urlPending ? 0.5 : 1,
            }}
          >
            {urlPending ? 'sealing…' : 'seal it'}
          </button>
          {videoId && (
            <GhostButton onClick={clearUrl} disabled={urlPending} size="sm">
              clear
            </GhostButton>
          )}
        </div>
        {urlError && (
          <p className="hand" style={{ marginTop: 8, color: 'var(--crimson)' }}>
            ~ {urlError} ~
          </p>
        )}
        {videoId && (
          <p className="mono" style={{ marginTop: 8, color: 'var(--ink-faint)', fontSize: 11 }}>
            stored video id: <span style={{ color: 'var(--ink)' }}>{videoId}</span>
          </p>
        )}
      </div>

      {previewId ? (
        <div
          style={{
            aspectRatio: '16 / 9',
            width: '100%',
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid var(--bronze-deep)',
            background: 'var(--night-deep)',
            boxShadow: 'inset 0 0 0 2px rgba(90, 63, 34, 0.4)',
          }}
        >
          <iframe
            key={previewId}
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${previewId}?rel=0&modestbranding=1`}
            title="Lesson preview"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            border: '1px dashed rgba(138, 106, 58, 0.4)',
            borderRadius: 3,
            background: 'rgba(232, 213, 165, 0.3)',
          }}
        >
          <p className="body-italic" style={{ color: 'var(--ink-soft)' }}>
            Paste a YouTube URL above and hit <em>seal it</em> to preview.
          </p>
        </div>
      )}
    </section>
  );
}
