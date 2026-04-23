// Client wrapper that renders the static BuildingShell underneath a
// short-duration BuildingTransition overlay — gives Academy + Market the
// same "Entering the <Building>" beat as the Tavern. Phase-2 polish; the
// real destination (course viewer / market grid) lands Phase 3 / 4.
//
// 2026-04-22: BuildingTransition switched to a dimmed-image design so
// the overlay needs both a display name + a background image path.

'use client';

import { useEffect, useState } from 'react';

import { BuildingShell, type BuildingShellProps } from './BuildingShell';
import { BuildingTransition } from './game/BuildingTransition';

const TRANSITION_MIN_DURATION_MS = 500;

const TRANSITION_META: Record<BuildingShellProps['name'], {
  readonly displayName: string;
  readonly backgroundImage: string;
}> = {
  tavern: { displayName: 'The Tavern', backgroundImage: '/tavern-interior.png' },
  academy: { displayName: 'The Academy', backgroundImage: '/academy-interior.png' },
  market: { displayName: 'The Market', backgroundImage: '/market-interior.png' },
};

export function BuildingShellWithTransition(props: BuildingShellProps): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), TRANSITION_MIN_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  const meta = TRANSITION_META[props.name];

  return (
    <>
      <BuildingShell {...props} />
      <BuildingTransition
        ready={ready}
        displayName={meta.displayName}
        backgroundImage={meta.backgroundImage}
      />
    </>
  );
}
