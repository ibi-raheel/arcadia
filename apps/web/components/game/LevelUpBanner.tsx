// Phase 5 Step 6 — cross-scene level-up overlay.
//
// React portal that listens on the global eventBus for 'level-up' events
// and renders a short (~2s) gold-gradient banner. Works identically in
// /world, /tavern, /academy, /market because it's a plain React overlay
// mounted alongside the Phaser canvas — not a Phaser animation.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { eventBus } from './net/event-bus';

const BANNER_MS = 2000;

export function LevelUpBanner(): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [visibleLevel, setVisibleLevel] = useState<number | null>(null);

  // Only portal after mount so SSR doesn't see a document reference.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const off = eventBus.on('level-up', (level) => {
      setVisibleLevel(level);
      const id = window.setTimeout(() => setVisibleLevel(null), BANNER_MS);
      return () => window.clearTimeout(id);
    });
    return off;
  }, []);

  if (!mounted || visibleLevel === null) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      aria-live="polite"
      role="status"
    >
      <div className="level-up-banner flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 px-10 py-6 shadow-[0_0_60px_rgba(251,191,36,0.6)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-950">Level Up</p>
        <p className="text-5xl font-black text-amber-950 drop-shadow">Level {visibleLevel}</p>
      </div>
      <style>{`
        @keyframes level-up-pop {
          0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
          15%  { opacity: 1; transform: scale(1.08) translateY(0); }
          25%  { transform: scale(1); }
          80%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05) translateY(-10px); }
        }
        .level-up-banner {
          animation: level-up-pop ${BANNER_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>,
    document.body,
  );
}
