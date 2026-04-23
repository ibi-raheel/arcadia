// /tavern-outside — image-backed outdoor area between /world and the
// three distinct tavern buildings. Each tavern door opens /tavern with a
// distinct `?b=<id>` so Colyseus `filterBy(['building'])` shards rooms.
// Walking off the west edge returns to /world.

import dynamic from 'next/dynamic';

const GameOutdoor = dynamic(() => import('@/components/game/GameOutdoor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading Tavern grounds…
    </div>
  ),
});

export default function TavernOutsidePage(): React.JSX.Element {
  return <GameOutdoor variant="tavern-outside" />;
}
