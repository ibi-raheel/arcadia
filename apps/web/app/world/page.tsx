// /world — image-backed town square with Colyseus on `world-realm1`.
// Replaces the ADR-0007 Tiled scene (GameWorldSquareV3) as of 2026-04-22;
// the Tiled files remain on disk but are no longer routed.
// Auth-gated by middleware. Each edge walks onto the neighbour scene:
// N → /academy-outside, E → /tavern-outside, S → /market, W → /coworking.
//
// Dynamic import with `{ ssr: false }` per TAD §3.2 — Phaser is
// browser-only and would crash server rendering.

import dynamic from 'next/dynamic';

const GameSquare = dynamic(() => import('@/components/game/GameSquare'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading world…
    </div>
  ),
});

export default function WorldPage(): React.JSX.Element {
  return <GameSquare />;
}
