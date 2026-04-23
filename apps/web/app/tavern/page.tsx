// Phase 2 Week 7 — Phaser-backed GameTavern (TAD §4.2). Academy + Market
// stay on their own pages.
//
// 2026-04-22: accepts `?b=<buildingId>` so distinct tavern doors on
// /tavern-outside shard into distinct Colyseus rooms. GameTavern uses
// `useSearchParams` which requires a Suspense boundary in Next 14.
//
// `next/dynamic({ ssr: false })` — Phaser touches `window` at import time.

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const GameTavern = dynamic(() => import('@/components/game/GameTavern'), {
  ssr: false,
});

export default function TavernPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
          Loading tavern…
        </div>
      }
    >
      <GameTavern />
    </Suspense>
  );
}
