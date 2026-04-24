// The Market Catalog scroll — opens when the member walks up to the
// central crystal in the Market and presses ENTER. Lists every
// published stall in the realm. Picking one fires the parent's onPick
// which in turn opens the existing StallView modal via ?course=<id>.
// Replaces the floating stall-card pattern that lived in the Phaser
// scene (2026-04-24).

'use client';

import { useEffect } from 'react';

import { Chip, DropCap, GhostButton, Hand, Kicker, MapCard } from '@/components/scriptorium';

import type { MarketStall } from '@/components/game/scenes/market/MarketScene';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly stalls: readonly MarketStall[];
  readonly locallyEnrolledIds: ReadonlySet<string>;
  readonly onPick: (courseId: string) => void;
};

export function CatalogScroll({
  open,
  onClose,
  stalls,
  locallyEnrolledIds,
  onPick,
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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-title"
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
      <div style={{ position: 'relative', maxWidth: 720, width: '100%', maxHeight: '88vh' }}>
        <MapCard style={{ overflowY: 'auto', maxHeight: '88vh', padding: 28 }}>
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
              color: 'var(--ink-quiet)',
              padding: 8,
              fontSize: 16,
              lineHeight: 1,
              borderRadius: 3,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-quiet)')}
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
            <DropCap letter="M" variant="wax" />
            <div style={{ flex: 1 }}>
              <Kicker>the market catalog</Kicker>
              <h2
                id="catalog-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 34,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                press enter to view catalog
              </h2>
              <Hand>~ every stall in the realm, laid out in ink ~</Hand>
            </div>
          </header>

          {stalls.length === 0 ? (
            <p
              className="body-italic"
              style={{ marginTop: 24, color: 'var(--ink-quiet)', textAlign: 'center' }}
            >
              no stalls in the market yet.
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                marginTop: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {stalls.map((s) => (
                <li key={s.id}>
                  <StallRow
                    stall={s}
                    enrolled={s.enrolled || locallyEnrolledIds.has(s.id)}
                    onPick={() => onPick(s.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          <footer
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <Hand>~ press ESC or click away to close ~</Hand>
            <GhostButton onClick={onClose} size="sm">
              keep walking
            </GhostButton>
          </footer>
        </MapCard>
      </div>
    </div>
  );
}

function StallRow({
  stall,
  enrolled,
  onPick,
}: {
  readonly stall: MarketStall;
  readonly enrolled: boolean;
  readonly onPick: () => void;
}): React.JSX.Element {
  const letter = stall.title.charAt(0).toUpperCase() || 'A';
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        width: '100%',
        borderRadius: 3,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--ink)',
        border: '1px solid rgba(138, 106, 58, 0.28)',
        background: 'rgba(255, 244, 210, 0.55)',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(201, 138, 58, 0.22)';
        e.currentTarget.style.borderColor = 'var(--bronze)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 244, 210, 0.55)';
        e.currentTarget.style.borderColor = 'rgba(138, 106, 58, 0.28)';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 3,
          background: enrolled
            ? 'radial-gradient(circle at 30% 25%, #88a080 0%, var(--verdigris) 55%, var(--verdigris-2))'
            : 'radial-gradient(circle at 30% 25%, #c13340 0%, var(--wax) 55%, var(--wax-deep))',
          color: 'var(--vellum)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 26,
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
          flexShrink: 0,
        }}
      >
        {letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            margin: 0,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stall.title}
        </h3>
        <p
          className="body-italic"
          style={{
            margin: '2px 0 0',
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          ~ by {stall.creatorName} ~
        </p>
        <p
          className="mono"
          style={{
            marginTop: 4,
            fontSize: 10,
            letterSpacing: 1.5,
            color: 'var(--ink-faint)',
          }}
        >
          {stall.lessonCount} LESSONS · {stall.enrolmentCount} ENROLLED
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {enrolled ? <Chip variant="verdigris">enrolled</Chip> : <Chip variant="wax">new</Chip>}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--bronze-deep)',
          }}
        >
          look closer →
        </span>
      </div>
    </button>
  );
}
