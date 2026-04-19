// Phase 2 Step 12 — fullscreen transition overlay shown on each building
// page while its destination (Phaser scene or React shell) warms up.
// Hidden once `ready === true` via a short opacity fade.
//
// Placeholder art: 1×1 transparent PNGs at `/transitions/<building>.png`.
// Real art drops in later with no code change — just replace the files.

'use client';

import { useEffect, useState } from 'react';

import type { BuildingName } from './scenes/shared/types';

const TITLES: Record<BuildingName, string> = {
  tavern: 'The Tavern',
  academy: 'The Academy',
  market: 'The Market',
};

export type BuildingTransitionProps = {
  readonly building: BuildingName;
  /** Flip to true when the destination is ready to show. */
  readonly ready: boolean;
};

export function BuildingTransition({ building, ready }: BuildingTransitionProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    // Keep the overlay in the DOM for the fade duration so the transition is
    // visible, then unmount.
    const id = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(id);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-label={`Entering ${TITLES[building]}`}
      className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-200 ${
        ready ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className="relative h-64 w-64 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/transitions/${building}.png)` }}
      />
      <p className="mt-6 text-lg font-medium tracking-tight text-neutral-200">
        Entering {TITLES[building]}…
      </p>
      <div className="mt-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
    </div>
  );
}
