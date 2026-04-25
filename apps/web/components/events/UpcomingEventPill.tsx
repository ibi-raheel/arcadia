// UpcomingEventPill — renders the next scheduled (or live-now) event
// as a compact pill. Used in the dashboard studio actions area + the
// landing hero so creators + members always see what's on the
// calendar next without having to visit /tavern.

'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { Hand, Kicker } from '@/components/scriptorium';
import { eventStatus, formatEventWhen, nextEvent } from '@/lib/events/status';
import { EVENTS_FIXTURE } from '@/lib/fixtures/events';
import type { LiveEvent } from '@/lib/fixtures/events';

type Props = {
  readonly events?: readonly LiveEvent[];
  /** Where to point the CTA — defaults to the event's location
   *  (`/tavern?b=<location>`). Set to a custom href for landings
   *  where you want to send members to `/world` instead. */
  readonly hrefFor?: (event: LiveEvent) => string;
  /** Dark-surface variant — used on the landing / shell headers. */
  readonly onDark?: boolean;
};

export function UpcomingEventPill({
  events = EVENTS_FIXTURE.events,
  hrefFor,
  onDark = false,
}: Props): React.JSX.Element | null {
  const event = useMemo(() => nextEvent(events), [events]);
  if (!event) return null;
  const status = eventStatus(event);
  const isLive = status === 'live';

  const href = hrefFor ? hrefFor(event) : `/tavern?b=${encodeURIComponent(event.location)}`;

  const dotColor = isLive ? 'var(--verdigris)' : 'var(--lantern)';
  const borderColor = isLive ? 'var(--verdigris)' : 'var(--bronze)';
  const textColor = onDark ? 'var(--vellum)' : 'var(--ink)';
  const bg = onDark
    ? 'rgba(10, 8, 6, 0.85)'
    : isLive
      ? 'rgba(90, 122, 92, 0.14)'
      : 'rgba(201, 138, 58, 0.12)';

  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 3,
        border: `1px dashed ${borderColor}`,
        background: bg,
        color: textColor,
        textDecoration: 'none',
        transition: 'background 140ms ease, border-color 140ms ease',
        maxWidth: 420,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 8px ${dotColor}`,
          flexShrink: 0,
          animation: isLive ? 'arcadia-event-pulse 1.6s ease-in-out infinite' : undefined,
        }}
      />
      <div style={{ minWidth: 0 }}>
        {onDark ? (
          <Kicker onDark>{isLive ? 'live now' : 'next up'}</Kicker>
        ) : (
          <Kicker>{isLive ? 'live now' : 'next up'}</Kicker>
        )}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 15,
            color: textColor,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}
        >
          {event.title}
        </div>
        {!isLive && (
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: onDark ? 'var(--vellum-shadow)' : 'var(--ink-soft)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {formatEventWhen(event)}
          </div>
        )}
        {isLive && <Hand onDark={onDark}>~ step into the tavern ~</Hand>}
      </div>
      <style>{`
        @keyframes arcadia-event-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </Link>
  );
}
