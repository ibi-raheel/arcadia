'use client';

import dynamic from 'next/dynamic';

// Phaser needs window / canvas / WebGL at import time. Dynamic with
// ssr:false pushes the whole bundle client-side (TAD §3.2).
const SpikeGame = dynamic(() => import('@/components/game/SpikeGame'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-neutral-400">
      Loading Phaser…
    </main>
  ),
});

export default function SpikePage() {
  return <SpikeGame />;
}
