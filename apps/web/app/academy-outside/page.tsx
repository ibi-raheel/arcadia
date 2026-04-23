// /academy-outside — image-backed outdoor area between /world and the
// Academy interior. Walking up to the outer gate and pressing SPACE enters
// /academy. Walking off the south edge returns to /world.
//
// Auth-gated by middleware; avatar-gated via lib/avatar-gate.ts (2026-04-22).

import dynamic from 'next/dynamic';

const GameOutdoor = dynamic(() => import('@/components/game/GameOutdoor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading Academy grounds…
    </div>
  ),
});

export default function AcademyOutsidePage(): React.JSX.Element {
  return <GameOutdoor variant="academy-outside" />;
}
