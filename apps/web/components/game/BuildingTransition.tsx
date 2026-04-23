// Phase 2 Step 12 — fullscreen transition overlay shown on each building
// page while its destination (Phaser scene or React shell) warms up.
// Hidden once `ready === true` via a short opacity fade.
//
// Placeholder art: 1×1 transparent PNGs at `/transitions/<building>.png`.
// Real art drops in later with no code change — just replace the files.

'use client';

import { useEffect, useState } from 'react';

import type { BuildingName } from './scenes/shared/types';

const DEFAULT_TITLES: Record<BuildingName, string> = {
  tavern: 'The Tavern',
  academy: 'The Academy',
  market: 'The Market',
};

export type BuildingTransitionProps = {
  readonly building: BuildingName;
  /** Flip to true when the destination is ready to show. */
  readonly ready: boolean;
  /**
   * Overrides the default "The Tavern" / "The Academy" / "The Market"
   * title — used for per-building tavern names (The Three Ravens, etc.)
   */
  readonly displayName?: string;
  /**
   * Path to a public image rendered full-screen behind the title, dimmed
   * to ~35%. When omitted, the small 256px icon at `/transitions/<name>.png`
   * is shown on a plain backdrop (pre-2026-04-22 behaviour).
   */
  readonly backgroundImage?: string;
};

export function BuildingTransition({
  building,
  ready,
  displayName,
  backgroundImage,
}: BuildingTransitionProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(id);
  }, [ready]);

  if (!mounted) return null;

  const title = displayName ?? DEFAULT_TITLES[building];

  return (
    <div
      role="status"
      aria-label={`Entering ${title}`}
      className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-200 ${
        ready ? 'opacity-0' : 'opacity-100'
      } ${backgroundImage ? '' : 'bg-[#0a0a0a]'}`}
    >
      {backgroundImage ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})`, filter: 'brightness(0.35)' }}
          />
          <div aria-hidden className="absolute inset-0 bg-black/30" />
        </>
      ) : (
        <div
          className="relative h-64 w-64 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(/transitions/${building}.png)` }}
        />
      )}
      <p className="relative mt-6 text-2xl font-semibold tracking-tight text-neutral-100 drop-shadow">
        {title}
      </p>
      <div className="relative mt-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
    </div>
  );
}
