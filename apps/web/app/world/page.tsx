// /world — Phaser-rendered orthogonal town square (ADR 0007).
// Auth-gated by middleware. Bridges at each edge act as walk-onto
// portals into /academy, /market, and /tavern.
//
// Dynamic import with `{ ssr: false }` per TAD §3.2 — Phaser is
// browser-only and would crash server rendering.

import dynamic from 'next/dynamic';

const GameWorldSquareV3 = dynamic(() => import('../world-square-v3/GameWorldSquareV3'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading world…
    </div>
  ),
});

export default function WorldPage(): React.JSX.Element {
  return <GameWorldSquareV3 />;
}
