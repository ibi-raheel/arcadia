// Phase 9 · async feed + live-event overlays for /tavern.
//
// Mounts inside `GameTavern` next to ChatPanel + LeaderboardPanel.
// Responsible for:
//   - loading posts + events via loadFeed (sim fallback handled by the
//     parent via useFetchOrMock)
//   - opening the FeedScroll modal when the Phaser scene emits
//     TAVERN_OPEN_FEED_EVENT (tablet trigger)
//   - rendering a verdigris "live now" banner when an event is live
//   - rendering the stage embed (YouTube iframe) when a live event has
//     a `streamUrl` — positioned over the bar TV area of the interior
//
// Side effects are all here. FeedScroll is pure presentational.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createPost, loadFeed } from '@/app/_actions/feed';
import { FeedScroll } from '@/components/feed/FeedScroll';
import { GhostButton, Hand, Kicker } from '@/components/scriptorium';
import { liveEvent } from '@/lib/events/status';
import { EVENTS_FIXTURE } from '@/lib/fixtures/events';
import type { LiveEvent } from '@/lib/fixtures/events';
import { FEED_FIXTURE } from '@/lib/fixtures/feed';
import type { FeedPost } from '@/lib/fixtures/feed';
import { useFetchOrMock } from '@/lib/fetch-or-mock';

import type { PhaserGameLike } from '@/components/tavern/types';

type Props = {
  readonly gameRef: React.MutableRefObject<PhaserGameLike | null>;
  readonly buildingId: string;
  readonly canPost: boolean;
};

const LIVE_POLL_MS = 30_000;

export function TavernFeatures({ gameRef, buildingId, canPost }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  // Load posts + events. In real mode, tries Supabase; fixture in sim.
  const realFetcher = useCallback(async () => {
    const result = await loadFeed();
    if (!result.ok) {
      // If the tables don't exist yet (pre-migration) or auth failed,
      // fall back to the fixture so the feature is still demo-able.
      return { posts: FEED_FIXTURE.posts, events: EVENTS_FIXTURE.events };
    }
    return result.value;
  }, []);
  const mock = useMemo(() => ({ posts: FEED_FIXTURE.posts, events: EVENTS_FIXTURE.events }), []);
  const { data, loading, refetch } = useFetchOrMock<{
    readonly posts: readonly FeedPost[];
    readonly events: readonly LiveEvent[];
  }>(realFetcher, mock);

  // Listen for the tablet-proximity ENTER press. Poll gameRef every
  // 500ms until it's populated (Phaser mounts async), then attach the
  // listener. This avoids the "gameRef.current in deps" lint rule
  // (refs aren't reactive) while still binding as soon as the game
  // boots.
  useEffect(() => {
    let attached = false;
    let listener: (() => void) | null = null;
    const onOpen = (): void => setOpen(true);
    const id = setInterval(() => {
      if (attached) return;
      const game = gameRef.current;
      if (!game) return;
      game.events.on('tavern:open-feed', onOpen);
      listener = onOpen;
      attached = true;
    }, 500);
    return () => {
      clearInterval(id);
      if (listener) gameRef.current?.events.off('tavern:open-feed', listener);
    };
  }, [gameRef]);

  // Keep "live now" status fresh — re-tick every 30s so the banner
  // appears/disappears at the right boundary without a full page reload.
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Only show events scoped to this tavern building. A Q&A scheduled
  // for `tavern-b` shouldn't banner in `tavern-a`.
  const eventsHere = useMemo(
    () => (data?.events ?? []).filter((e) => e.location === buildingId),
    [data?.events, buildingId],
  );
  const live = useMemo(() => liveEvent(eventsHere), [eventsHere]);

  const handlePost = useCallback(
    async (body: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await createPost({ body, kind: 'text' });
      // The server action writes the post + revalidates the cache, but
      // useFetchOrMock holds the React state — `revalidatePath` doesn't
      // auto-refresh client state. Without an explicit refetch, the
      // poster never sees their own post until the modal closes + reopens.
      if (result.ok) refetch();
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    [refetch],
  );

  const focusStage = useCallback(() => {
    // The stage is anchored in-world (see StageEmbed below); closing the
    // modal + nothing else puts the member back on the scene canvas with
    // the banner still visible. Future: could pan the camera to the
    // screen.
    setOpen(false);
  }, []);

  if (loading && !data) return <></>;

  return (
    <>
      {live && <LiveEventBanner event={live} />}
      {live?.streamUrl && <StageEmbed event={live} />}

      <FeedScroll
        open={open}
        onClose={() => setOpen(false)}
        posts={data?.posts ?? []}
        events={data?.events ?? []}
        canPost={canPost}
        onPost={handlePost}
        onFocusStage={live ? focusStage : undefined}
      />
    </>
  );
}

/** Top-of-viewport banner — "live now · Q&A in the tavern". */
function LiveEventBanner({ event }: { readonly event: LiveEvent }): React.JSX.Element {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        maxWidth: 'calc(100vw - 24px)',
        padding: '10px 18px',
        background: 'rgba(10, 8, 6, 0.92)',
        border: '1.5px solid var(--verdigris)',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.55), 0 0 24px rgba(90, 122, 92, 0.35)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--verdigris)',
          boxShadow: '0 0 10px var(--verdigris)',
          animation: 'arcadia-live-pulse 1.6s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <div>
        <Kicker onDark>live now · in this tavern</Kicker>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--vellum)',
            lineHeight: 1.1,
            marginTop: 1,
          }}
        >
          {event.title}
        </div>
      </div>
      <Hand onDark>~ by {event.creatorName} ~</Hand>
      <style>{`
        @keyframes arcadia-live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}

/** Stage embed — when a live event has a stream_url, overlay a
 *  YouTube iframe in the top-right corner of the canvas so avatars
 *  in the tavern "gather" to watch. Positioned far from the chat
 *  panel (bottom-right) + leaderboard (top-right upper) so all three
 *  panels are visible at once. */
function StageEmbed({ event }: { readonly event: LiveEvent }): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          top: 70,
          right: 14,
          zIndex: 40,
          padding: '8px 12px',
          background: 'rgba(10, 8, 6, 0.92)',
          border: '1.5px solid var(--verdigris)',
          borderRadius: 3,
          color: 'var(--vellum)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--verdigris)',
            boxShadow: '0 0 8px var(--verdigris)',
          }}
        />
        open the stage
      </button>
    );
  }
  return (
    <div
      style={{
        position: 'fixed',
        top: 70,
        right: 14,
        zIndex: 40,
        width: 360,
        maxWidth: 'calc(100vw - 28px)',
        background: 'rgba(10, 8, 6, 0.92)',
        border: '1.5px solid var(--bronze-deep)',
        borderRadius: 3,
        boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px dashed var(--bronze-deep)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--verdigris)',
              boxShadow: '0 0 8px var(--verdigris)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Kicker onDark>the stage · live</Kicker>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--vellum)',
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {event.title}
            </div>
          </div>
        </div>
        <GhostButton size="sm" onDark onClick={() => setCollapsed(true)}>
          fold
        </GhostButton>
      </header>
      <div style={{ aspectRatio: '16 / 9', background: '#000' }}>
        <iframe
          src={event.streamUrl ?? undefined}
          title={event.title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          width="100%"
          height="100%"
          style={{ display: 'block', border: 'none' }}
        />
      </div>
    </div>
  );
}
