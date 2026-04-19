// Phase 1 shell for the three building pages. Each building gets its own
// route (app/tavern, app/academy, app/market) per TAD §4.2; content
// diverges in Phase 2+ (Tavern gains a Phaser scene + chat; Academy/Market
// gain React viewers). For Phase 1 they're structurally identical — header,
// "Coming in Phase N" placeholder, and a Return-to-World link.

import Link from 'next/link';

import type { BuildingName } from './game/scenes/shared/types';

export type BuildingShellProps = {
  readonly name: BuildingName;
  readonly title: string;
  readonly comingInPhase: string;
};

export function BuildingShell({
  name,
  title,
  comingInPhase,
}: BuildingShellProps): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-neutral-200">
      <header className="border-b border-neutral-800 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-neutral-500">
        {comingInPhase}
      </div>
      <footer className="border-t border-neutral-800 p-4">
        <Link
          href={`/world?from=${name}`}
          className="inline-block rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white"
        >
          Return to World
        </Link>
      </footer>
    </main>
  );
}
