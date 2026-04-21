'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

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
    <section className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
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
        <button
          type="button"
          onClick={convertToWritten}
          disabled={typePending}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
        >
          Convert to written
        </button>
      </header>

      {typeError && (
        <p className="rounded-md bg-red-950/50 px-3 py-2 text-xs text-red-300">{typeError}</p>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          YouTube URL
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Paste any YouTube share URL (unlisted is fine). We only store the 11-character video id.
        </p>
        <div className="mt-3 flex gap-2">
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
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={saveUrl}
            disabled={urlPending}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {urlPending ? 'Saving…' : 'Save'}
          </button>
          {videoId && (
            <button
              type="button"
              onClick={clearUrl}
              disabled={urlPending}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500 hover:text-red-300 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
        {urlError && <p className="mt-2 text-xs text-red-300">{urlError}</p>}
        {videoId && (
          <p className="mt-2 text-xs text-slate-500">
            Stored video id: <span className="font-mono text-slate-300">{videoId}</span>
          </p>
        )}
      </div>

      {previewId ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
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
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-500">
          Paste a YouTube URL above and hit Save to preview the embed.
        </div>
      )}
    </section>
  );
}
