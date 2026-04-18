'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { SpikeScene } from './scenes/SpikeScene';

// Client-only Phaser mount. Parent MUST load this via
// `dynamic(..., { ssr: false })` — Phaser references `window`, `canvas`,
// and WebGL at module-eval time (TAD §3.2).

export default function SpikeGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 640,
      backgroundColor: '#111111',
      scene: [SpikeScene],
      render: {
        pixelArt: true,
        antialias: false,
      },
      // Cap FPS slightly above target so requestAnimationFrame doesn't
      // spike above 60 on a high-refresh monitor — keeps the measurement
      // honest against the PRD §5 target.
      fps: { target: 60, forceSetTimeOut: false },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-8 text-neutral-200">
      <h1 className="text-lg font-medium">Isometric spike — Phase 0 Step 19</h1>
      <p className="max-w-lg text-center text-xs text-neutral-500">
        Phaser 3.88 · 10×10 orthographic tilemap · two y-sorted avatars · FPS counter overlay.
        Placeholder art; real iso tileset + avatars in Phase 1 Week 3.
      </p>
      <div
        ref={containerRef}
        className="overflow-hidden rounded border border-neutral-800 bg-black"
        style={{ width: 960, height: 640 }}
      />
      <p className="max-w-lg text-center text-xs text-neutral-600">
        To validate the PRD §5 60 FPS target, open Chrome DevTools → Performance → Throttle CPU 6× →
        leave this page running for 60 seconds. Minimum FPS shown in the top-left overlay should
        stay at 60.
      </p>
    </main>
  );
}
