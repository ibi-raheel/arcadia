// /coworking — image-backed outdoor area between /world and five distinct
// coworking tent interiors. Each tent opens /coworking/inside with a
// distinct `?b=<id>` so Colyseus `filterBy(['building'])` shards rooms.
// Walking off the east edge returns to /world.

import dynamic from 'next/dynamic';

const GameOutdoor = dynamic(() => import('@/components/game/GameOutdoor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading Coworking grounds…
    </div>
  ),
});

export default function CoworkingOutsidePage(): React.JSX.Element {
  return <GameOutdoor variant="coworking-outside" />;
}
