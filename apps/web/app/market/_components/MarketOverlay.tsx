// Fullscreen overlay that hosts the four-stall <Market> dashboard on
// top of the Phaser MarketScene. Opens when the player walks up to
// the central crystal and presses ENTER (the scene fires
// `MARKET_OPEN_CATALOG_EVENT`; `GameMarket.tsx` listens and toggles
// this overlay's `open` prop).
//
// Header carries three actions: ✕ close (returns to the Phaser
// scene), ← return to world (full navigation to /world), and logout
// (POSTs the signout endpoint at the top level so any in-world
// state is cleanly torn down). Esc closes the overlay (same as ✕).
//
// We intentionally keep the overlay as React-on-the-same-page (not
// an iframe) because the parent route is the Phaser scene — losing
// it on every overlay open would defeat the purpose of an
// in-world dashboard.

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { GhostButton } from '@/components/scriptorium';

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
      <OverlayActions onClose={onClose} />
    </div>
  );
}

/** Top-right button cluster. Sits above the dashboard at z-index 90
 *  so it's reachable from both the picker and the category view
 *  without each of those needing to know about navigation. */
function OverlayActions({ onClose }: { readonly onClose: () => void }): React.JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Link href="/world" style={{ textDecoration: 'none' }}>
        <GhostButton size="sm" onDark>
          ← return to the world
        </GhostButton>
      </Link>
      {/* `target="_top"` matters when the market overlay is itself
          embedded — the form must replace the top-level window so
          everything (Phaser canvas + audio + Colyseus) tears down
          cleanly post-signout. */}
      <form action="/api/auth/signout" method="post" target="_top" style={{ margin: 0 }}>
        <GhostButton size="sm" onDark type="submit">
          logout
        </GhostButton>
      </form>
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
