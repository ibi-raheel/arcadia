// The wanderer's welcome surface. Static — no LLM, no API calls,
// no localStorage history. A short greeting at the top, then a 2x2
// grid of flip cards introducing Arcadia's main neighbourhoods.
//
// See ADR 0017 for why this replaced the AI chat that shipped in
// Phase 11. The proximity prompt + ENTER trigger that opens this
// surface is unchanged (SquareScene → SQUARE_OPEN_SAGE_EVENT →
// SageFeatures); only what opens here changed.

'use client';

import { useEffect, type CSSProperties } from 'react';

import {
  DropCap,
  FlipCard,
  Hand,
  Kicker,
  ScrollCard,
  VellumCard,
  WaxSeal,
} from '@/components/scriptorium';
import {
  emitOverlayInputBlur,
  emitOverlayInputFocus,
} from '@/components/game/scenes/shared/overlay-input-events';
import { SAGE_CARDS, type SageCard } from '@/lib/sage/cards';

type Props = {
  readonly onClose: () => void;
};

export function SageDialogue({ onClose }: Props): React.JSX.Element {
  // Esc closes the dialogue.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Phaser captures keys (WASD, SPACE, ENTER) for movement. While the
  // dialogue is open we want flip cards to receive Enter/Space, so we
  // tell Phaser to release its capture for the duration.
  useEffect(() => {
    emitOverlayInputFocus();
    return () => emitOverlayInputBlur();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="welcome to Arcadia"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(5, 2, 8, 0.78)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760 }}>
        <ScrollCard style={{ position: 'relative', padding: '26px 28px' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={closeButtonStyle}
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
              paddingBottom: 16,
              borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
            }}
          >
            <DropCap letter="W" variant="blue" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Kicker>the wanderer</Kicker>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                welcome, traveller.
              </h2>
              <Hand>~ here are the four corners of Arcadia. tap any scroll to read its back. ~</Hand>
            </div>
          </header>

          {/* 2x2 grid of flip cards */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
            }}
          >
            {SAGE_CARDS.map((card) => (
              <FlipCard
                key={card.id}
                ariaLabel={`${card.label} card — flip to read more`}
                front={<CardFront card={card} />}
                back={<CardBack card={card} />}
              />
            ))}
          </div>

          {/* Footer */}
          <p
            style={{
              margin: '16px 0 0',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--ink-soft)',
              textAlign: 'center',
              opacity: 0.75,
            }}
          >
            tap a scroll to flip it · esc to leave
          </p>
        </ScrollCard>
      </div>
    </div>
  );
}

const closeButtonStyle: CSSProperties = {
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
  zIndex: 1,
};

function CardFront({ card }: { readonly card: SageCard }): React.JSX.Element {
  return (
    <VellumCard
      style={{
        width: '100%',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 10,
      }}
    >
      <WaxSeal letter={card.sigil} style={{ width: 44, height: 44, fontSize: 20 }} />
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 19,
          margin: 0,
          color: 'var(--ink)',
          lineHeight: 1.15,
        }}
      >
        {card.label}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          lineHeight: 1.45,
          color: 'var(--ink-soft)',
          margin: 0,
          maxWidth: '20ch',
        }}
      >
        {card.tagline}
      </p>
    </VellumCard>
  );
}

function CardBack({ card }: { readonly card: SageCard }): React.JSX.Element {
  return (
    <VellumCard
      style={{
        width: '100%',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.25)',
          paddingBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--ink)',
          }}
        >
          {card.label}
        </span>
      </header>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {card.body}
      </p>
      <Hand>~ {card.hint} ~</Hand>
    </VellumCard>
  );
}
