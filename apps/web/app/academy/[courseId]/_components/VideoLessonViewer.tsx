'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  flushLessonProgress,
  markLessonCompleted,
  setLessonDurationIfNull,
  upsertLessonProgress,
} from '../actions';

// YouTube IFrame API player-state codes.
const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;

const PROGRESS_POLL_MS = 10_000;

type YTEvent = { data: number };
type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        target: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: YTEvent & { target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiLoaded = false;
const iframeApiReadyCallbacks: Array<() => void> = [];

function loadIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    iframeApiReadyCallbacks.push(resolve);
    if (iframeApiLoaded) return;
    iframeApiLoaded = true;
    window.onYouTubeIframeAPIReady = () => {
      iframeApiReadyCallbacks.splice(0).forEach((cb) => cb());
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  });
}

export type VideoLessonInitial = {
  readonly lessonId: string;
  readonly videoId: string;
  readonly startSec: number;
  readonly durationSec: number | null;
};

type Props = {
  readonly initial: VideoLessonInitial;
  /** Preview mode (Market stall view): skip progress tracking + duration
   *  capture + completion side-effects. Player still resumes at startSec. */
  readonly previewOnly?: boolean;
};

export function VideoLessonViewer({ initial, previewOnly = false }: Props): React.JSX.Element {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const durationRef = useRef<number | null>(initial.durationSec);
  const lastWatchedRef = useRef<number>(initial.startSec);
  const markedCompleteRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sendProgress = async (watched: number): Promise<void> => {
      lastWatchedRef.current = watched;
      if (previewOnly) return;
      const result = await upsertLessonProgress(initial.lessonId, watched, durationRef.current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // If the server-computed completion just flipped to true (watched
      // crossed the 80% threshold), refresh so the left-rail ✓ updates
      // without forcing the user to reload.
      if (
        !markedCompleteRef.current &&
        durationRef.current != null &&
        durationRef.current > 0 &&
        watched >= 0.8 * durationRef.current
      ) {
        markedCompleteRef.current = true;
        router.refresh();
      }
    };

    const forceComplete = async (): Promise<void> => {
      if (previewOnly) return;
      if (markedCompleteRef.current) return;
      markedCompleteRef.current = true;
      // markLessonCompleted is duration-independent; used when the video
      // hits STATE_ENDED so we don't rely on the threshold arithmetic.
      const result = await markLessonCompleted(initial.lessonId);
      if (!result.ok) {
        markedCompleteRef.current = false;
        setError(result.error);
      } else {
        router.refresh();
      }
    };

    const startPolling = (player: YTPlayer): void => {
      if (pollTimerRef.current !== null) return;
      pollTimerRef.current = window.setInterval(() => {
        void sendProgress(player.getCurrentTime());
      }, PROGRESS_POLL_MS);
    };

    const stopPolling = (): void => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // Clamp start to just before the end. If last session recorded
    // watched_secs == duration (natural ENDED state), loading with
    // `start >= duration` renders a black frame — YouTube can't seek past
    // the clip. Back off to 0 so the user sees a valid thumbnail.
    const END_SAFETY_SEC = 2;
    const clampedStart =
      initial.durationSec != null && initial.startSec >= initial.durationSec - END_SAFETY_SEC
        ? 0
        : Math.max(0, Math.floor(initial.startSec));

    void loadIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      const player = new window.YT.Player(hostRef.current, {
        videoId: initial.videoId,
        playerVars: {
          start: clampedStart,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: async (event) => {
            playerRef.current = event.target;
            // Capture duration on first play if we don't know it yet.
            // Without this, the 80% threshold can't be evaluated during
            // playback, so completion would never fire from the polling
            // path. STATE_ENDED's forceComplete() is the safety net.
            // Skipped in previewOnly mode — no server-side writes from
            // Market stall previews.
            if (!previewOnly && durationRef.current === null) {
              const reported = Math.round(event.target.getDuration());
              if (reported > 0) {
                durationRef.current = reported;
                const res = await setLessonDurationIfNull(initial.lessonId, reported);
                if (!res.ok) setError(res.error);
              }
            }
          },
          onStateChange: (event) => {
            if (event.data === STATE_PLAYING) {
              startPolling(event.target);
            } else if (event.data === STATE_PAUSED) {
              stopPolling();
              void sendProgress(event.target.getCurrentTime());
            } else if (event.data === STATE_ENDED) {
              stopPolling();
              // Natural end-of-video → unconditional completion, regardless
              // of whether duration_sec was captured in time to cross the
              // 80% threshold. Also refreshes the UI so the ✓ shows.
              void sendProgress(event.target.getCurrentTime());
              void forceComplete();
            }
          },
        },
      });
      playerRef.current = player;
    });

    // Best-effort flush on tab close. Server action via fetch POST — we
    // can't use sendBeacon easily here (Next Server Actions expect RSC
    // POSTs), so fall through to a synchronous fire-and-forget.
    const handleBeforeUnload = (): void => {
      if (previewOnly) return;
      const lastWatched = lastWatchedRef.current;
      void flushLessonProgress(
        initial.lessonId,
        lastWatched,
        durationRef.current,
        initial.durationSec === null && durationRef.current !== null,
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      stopPolling();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // One final flush on unmount (lesson-switch, route change).
      const watched = playerRef.current?.getCurrentTime() ?? lastWatchedRef.current;
      void sendProgress(watched);
      try {
        playerRef.current?.destroy();
      } catch {
        // Player may already be torn down; ignore.
      }
      playerRef.current = null;
    };
  }, [initial.lessonId, initial.videoId, initial.startSec, initial.durationSec]);

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div ref={hostRef} className="h-full w-full" />
      </div>
      {error && <p className="mt-2 text-xs text-red-300">Couldn&rsquo;t save progress: {error}</p>}
    </div>
  );
}
