// FeedScroll — the async-feed modal that pops up when the member
// walks up to the tablet in the tavern + presses ENTER.
//
// Reads a merged timeline of posts + upcoming/live events and renders
// it on a ScrollCard. Shows:
//   - header with drop cap + marginalia
//   - optional "live now" banner at the top if any event is currently
//     running (click → closes the modal and focuses the tavern stage)
//   - optional upcoming-event card
//   - timeline of posts (newest first), with event-created entries
//     rendering the event card inline
//   - composer at the bottom — visible only if `canPost` is true
//
// Purely presentational; all IO goes through the passed-in
// `onPost` / `onFocusStage` callbacks so the surrounding mount (tavern
// or preview) controls side effects.

'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  BronzeButton,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumCard,
} from '@/components/scriptorium';
import {
  eventStatus,
  formatEventWhen,
  liveEvent,
  nextEvent,
  relativeTime,
} from '@/lib/events/status';
import type { LiveEvent } from '@/lib/fixtures/events';
import type { FeedPost } from '@/lib/fixtures/feed';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly posts: readonly FeedPost[];
  readonly events: readonly LiveEvent[];
  /** When true, the composer renders at the bottom of the scroll. */
  readonly canPost: boolean;
  /** Called when the composer posts. Parent does the real write; this
   *  component just clears the textarea + lets the parent refetch. */
  readonly onPost?: (body: string) => Promise<{ ok: boolean; error?: string }>;
  /** Called when the "join the auditorium" CTA on the live-event
   *  banner is clicked. Parent closes the modal + focuses the tavern
   *  stage. When absent, the banner just closes the modal. */
  readonly onFocusStage?: () => void;
};

export function FeedScroll({
  open,
  onClose,
  posts,
  events,
  canPost,
  onPost,
  onFocusStage,
}: Props): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const liveNow = useMemo(() => liveEvent(events), [events]);
  const next = useMemo(() => nextEvent(events), [events]);
  // Index events by id so post entries of kind `event-created` can
  // render the actual event card.
  const eventsById = useMemo(() => {
    const m = new Map<string, LiveEvent>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(5, 2, 8, 0.72)',
        backdropFilter: 'blur(14px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ position: 'relative', maxWidth: 720, width: '100%', maxHeight: '90vh' }}>
        <ScrollCard style={{ overflowY: 'auto', maxHeight: '90vh' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-soft)',
              padding: 8,
              fontSize: 16,
              lineHeight: 1,
              borderRadius: 3,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-soft)')}
          >
            ✕
          </button>

          <header
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              paddingBottom: 18,
              borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
            }}
          >
            <DropCap letter="F" variant="blue" />
            <div style={{ flex: 1 }}>
              <Kicker>the tavern tablet</Kicker>
              <h2
                id="feed-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 34,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                the feed
              </h2>
              <Hand>~ what happened while you were away ~</Hand>
            </div>
          </header>

          {liveNow && (
            <LiveNowBanner
              event={liveNow}
              onFocusStage={
                onFocusStage
                  ? () => {
                      onFocusStage();
                      onClose();
                    }
                  : onClose
              }
            />
          )}

          {!liveNow && next && <UpcomingBanner event={next} />}

          {posts.length === 0 ? (
            <p
              className="body-italic"
              style={{ marginTop: 22, color: 'var(--ink-soft)', textAlign: 'center' }}
            >
              no notes yet. the tablet is quiet.
            </p>
          ) : (
            <ol
              style={{
                marginTop: 20,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {posts.map((p) => {
                const relatedEventId =
                  p.kind === 'event-created'
                    ? (p.metadata['event_id'] as string | undefined)
                    : undefined;
                const relatedEvent = relatedEventId ? eventsById.get(relatedEventId) : undefined;
                return (
                  <li key={p.id}>
                    <FeedRow post={p} event={relatedEvent} />
                  </li>
                );
              })}
            </ol>
          )}

          {canPost && onPost && (
            <FeedComposer
              onPost={onPost}
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
              }}
            />
          )}

          <footer
            style={{
              marginTop: 24,
              paddingTop: 14,
              borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <Hand>~ press ESC or click away to close ~</Hand>
            <GhostButton size="sm" onClick={onClose}>
              step away
            </GhostButton>
          </footer>
        </ScrollCard>
      </div>
    </div>
  );
}

function LiveNowBanner({
  event,
  onFocusStage,
}: {
  readonly event: LiveEvent;
  readonly onFocusStage: () => void;
}): React.JSX.Element {
  return (
    <div
      role="status"
      style={{
        marginTop: 16,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(90, 122, 92, 0.2), rgba(90, 122, 92, 0.1))',
        border: '1.5px solid var(--verdigris)',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--verdigris)',
          boxShadow: '0 0 12px var(--verdigris)',
          animation: 'arcadia-pulse 1.6s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 180 }}>
        <Kicker>live now · in the tavern</Kicker>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          {event.title}
        </div>
        <Hand>~ by {event.creatorName} ~</Hand>
      </div>
      <BronzeButton size="sm" onClick={onFocusStage}>
        join the auditorium →
      </BronzeButton>
      <style>{`
        @keyframes arcadia-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.82); }
        }
      `}</style>
    </div>
  );
}

function UpcomingBanner({ event }: { readonly event: LiveEvent }): React.JSX.Element {
  return (
    <div
      style={{
        marginTop: 16,
        padding: '14px 16px',
        background: 'rgba(201, 138, 58, 0.12)',
        border: '1px dashed var(--bronze)',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 3,
          background:
            'radial-gradient(circle at 30% 25%, var(--lantern) 0%, var(--lantern-2) 55%, var(--bronze-deep))',
          color: 'var(--night)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 20,
          boxShadow: 'inset 0 0 0 1px var(--bronze-deep)',
          flexShrink: 0,
        }}
      >
        ☉
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <Kicker>next up</Kicker>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--ink)',
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          {event.title}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 1.3,
            color: 'var(--ink-soft)',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {formatEventWhen(event)}
        </div>
      </div>
    </div>
  );
}

const KIND_GLYPH: Record<FeedPost['kind'], string> = {
  text: '✎',
  announcement: '✦',
  'event-created': '☉',
};

function FeedRow({
  post,
  event,
}: {
  readonly post: FeedPost;
  readonly event?: LiveEvent;
}): React.JSX.Element {
  const status = event ? eventStatus(event) : null;
  const accent =
    post.kind === 'announcement'
      ? 'var(--wax)'
      : post.kind === 'event-created'
        ? 'var(--lantern)'
        : 'var(--bronze-deep)';
  return (
    <VellumCard
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 30% 25%, var(--bronze-bright) 0%, var(--bronze) 55%, var(--bronze-deep))',
            color: 'var(--night)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {post.authorSeal}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {post.authorName}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            <span aria-hidden="true">{KIND_GLYPH[post.kind]}</span>{' '}
            {post.kind === 'announcement'
              ? 'announcement'
              : post.kind === 'event-created'
                ? 'scheduled · event'
                : 'note'}
            {' · '}
            {relativeTime(post.createdAt)}
          </div>
        </div>
      </header>

      {event ? (
        <EventCard event={event} status={status!} body={post.body} />
      ) : (
        <BodyParagraphs body={post.body} />
      )}
    </VellumCard>
  );
}

function BodyParagraphs({ body }: { readonly body: string }): React.JSX.Element {
  const paragraphs = body.split(/\n\s*\n/);
  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        color: 'var(--ink)',
        lineHeight: 1.55,
      }}
    >
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0' }}>
          {renderSimpleMarkdown(p)}
        </p>
      ))}
    </div>
  );
}

/** Handles just *italic* and **bold** for the timeline. A full
 *  markdown renderer here would pull react-markdown onto what should
 *  be quiet social copy — the existing WrittenLessonViewer covers
 *  rich lesson bodies when we need them. */
function renderSimpleMarkdown(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) out.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

function EventCard({
  event,
  status,
  body,
}: {
  readonly event: LiveEvent;
  readonly status: 'past' | 'upcoming' | 'live';
  readonly body: string;
}): React.JSX.Element {
  const statusChip =
    status === 'live' ? (
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--verdigris)',
          textTransform: 'uppercase',
        }}
      >
        ● live now
      </span>
    ) : status === 'upcoming' ? (
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--bronze-deep)',
          textTransform: 'uppercase',
        }}
      >
        upcoming
      </span>
    ) : (
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
        }}
      >
        past
      </span>
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          {event.title}
        </div>
        {statusChip}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
        }}
      >
        {formatEventWhen(event)} · {event.location}
      </div>
      <p
        className="body-italic"
        style={{
          margin: '4px 0 0',
          color: 'var(--ink-soft)',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {event.description ?? body}
      </p>
    </div>
  );
}

function FeedComposer({
  onPost,
  style,
}: {
  readonly onPost: (body: string) => Promise<{ ok: boolean; error?: string }>;
  readonly style?: React.CSSProperties;
}): React.JSX.Element {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = (): void => {
    const body = value.trim();
    if (body.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await onPost(body);
      if (!result.ok) {
        setError(result.error ?? 'could not post');
        return;
      }
      setValue('');
      ref.current?.focus();
    });
  };

  return (
    <div style={style}>
      <Kicker>ink a note for your folk</Kicker>
      <textarea
        ref={ref}
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What's on the bench today?"
        disabled={pending}
        rows={3}
        style={{
          marginTop: 6,
          resize: 'vertical',
          lineHeight: 1.5,
          padding: '8px 2px',
          minHeight: 72,
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        {error ? (
          <p className="hand" role="alert" style={{ margin: 0, color: 'var(--crimson)' }}>
            ~ {error} ~
          </p>
        ) : (
          <Hand>~ ⌘+Enter to post ~</Hand>
        )}
        <BronzeButton onClick={submit} disabled={pending || value.trim().length === 0} size="sm">
          {pending ? 'posting…' : 'post to the feed'}
        </BronzeButton>
      </div>
    </div>
  );
}
