// Phase 2 Step 12 — fullscreen transition overlay shown on each building
// page while its destination (Phaser scene or React shell) warms up.
// Hidden once `ready === true` via a short opacity fade.
//
// Placeholder art: 1×1 transparent PNGs at `/transitions/<building>.png`.
// Real art drops in later with no code change — just replace the files.

'use client';

import { useEffect, useState } from 'react';

// 2026-04-22: every scene transition shares the same visual treatment —
// dim the destination's background PNG to ~35% and show its name on
// top. Callers pass the PNG path + display name; there's no default
// branch any more. Used by GameSquare / GameOutdoor /
// GameCoworkingInside / GameTavern / GameAcademy / GameMarket.

export type BuildingTransitionProps = {
  /** Flip to true when the destination is ready to show. */
  readonly ready: boolean;
  /** Shown in the middle of the overlay. */
  readonly displayName: string;
  /**
   * Path to a public image rendered full-screen behind the title,
   * dimmed to ~35% so the title reads clearly against it.
   */
  readonly backgroundImage: string;
};

export function BuildingTransition({
  ready,
  displayName,
  backgroundImage,
}: BuildingTransitionProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    // Keep the overlay in the DOM for the fade duration, then unmount.
    const id = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(id);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-label={`Entering ${displayName}`}
      className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-200 ${
        ready ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})`, filter: 'brightness(0.35)' }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/30" />
      <p className="relative mt-6 text-3xl font-semibold tracking-tight text-neutral-100 drop-shadow-lg">
        {displayName}
      </p>
      <div className="relative mt-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
    </div>
  );
}
