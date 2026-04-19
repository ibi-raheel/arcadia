// Phase 2 Week 7 — swap BuildingShell for the Phaser-backed GameTavern
// (TAD §4.2). Academy + Market stay on BuildingShell.
//
// `next/dynamic({ ssr: false })` — Phaser touches `window` at import time.

import dynamic from 'next/dynamic';

const GameTavern = dynamic(() => import('@/components/game/GameTavern'), {
  ssr: false,
});

export default function TavernPage(): React.JSX.Element {
  return <GameTavern />;
}
