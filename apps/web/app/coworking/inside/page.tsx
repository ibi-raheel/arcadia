// /coworking/inside?b=<tentId> — multiplayer tent interior. One Colyseus
// `coworking-realm1` room per tent (via filterBy(['building'])), auto-shard
// at 20 clients.

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const GameCoworkingInside = dynamic(() => import('@/components/game/GameCoworkingInside'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
      Loading tent…
    </div>
  ),
});

export default function CoworkingInsidePage(): React.JSX.Element {
  // `useSearchParams` in the mount reads `?b=`; Next requires a Suspense
  // boundary around clients that call it so the page can render statically
  // before the query string is known.
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-300">
          Loading tent…
        </div>
      }
    >
      <GameCoworkingInside />
    </Suspense>
  );
}
