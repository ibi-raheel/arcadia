// /world — Phaser-rendered outdoor isometric world. Auth-gated by middleware;
// Phase 1 Step 11 adds a second gate that redirects avatar-less members to
// /onboarding/avatar.
//
// The Phaser canvas mount is `next/dynamic`-imported with `{ ssr: false }`
// per TAD §3.2 — Phaser is browser-only and would crash server rendering.

import dynamic from 'next/dynamic';

const GameWorld = dynamic(() => import('@/components/game/GameWorld'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading world…
    </div>
  ),
});

export default function WorldPage(): React.JSX.Element {
  return <GameWorld />;
}
