// Fullscreen overlay that hosts the four-stall <Market> dashboard on
// top of the Phaser MarketScene. Opens when the player walks up to
// the central crystal and presses ENTER (the scene fires
// `MARKET_OPEN_CATALOG_EVENT`; `GameMarket.tsx` listens and toggles
// this overlay's `open` prop).
//
// **Header (2026-05-02 simplified)**: just the ✕ close button at
// top-right (z-index 90). Earlier iterations carried ← return-to-
// world + logout for direct-entry, plus a path-aware branch — both
// removed per user feedback. The overlay is now a pure dashboard:
// closing returns the player to the Phaser scene, where the top
// archway returns to /world. Logout lives on the creator dashboard
// (and the future member dashboard).
//
// We intentionally keep the overlay as React-on-the-same-page (not
// an iframe) because the parent route is the Phaser scene — losing
// it on every overlay open would defeat the purpose of an
// in-world dashboard.

'use client';

import { useEffect } from 'react';

import type { MarketItem } from '@/lib/market/types';

import { Market } from './Market';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly courses: ReadonlyArray<MarketItem>;
};

export function MarketOverlay({ open, onClose, courses }: Props): React.JSX.Element | null {
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
      aria-label="The Market"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'var(--night, #050208)',
        overflow: 'auto',
      }}
    >
      <Market courses={courses} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close the market"
        title="Close (Esc)"
        style={closeButtonStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gilt, #e7c66c)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--bronze-bright, #d4a868)')}
      >
        ✕
      </button>
    </div>
  );
}

const closeButtonStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 90,
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(20, 10, 5, 0.85)',
  border: '1px solid rgba(212, 165, 116, 0.55)',
  borderRadius: 4,
  color: 'var(--bronze-bright, #d4a868)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
  transition: 'color 120ms ease-out',
};
