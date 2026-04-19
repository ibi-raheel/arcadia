// Client wrapper that renders the static BuildingShell underneath a
// short-duration BuildingTransition overlay — gives Academy + Market the
// same "Entering the <Building>" beat as the Tavern. Phase-2 polish; the
// real destination (course viewer / market grid) lands Phase 3 / 4.

'use client';

import { useEffect, useState } from 'react';

import { BuildingShell, type BuildingShellProps } from './BuildingShell';
import { BuildingTransition } from './game/BuildingTransition';

const TRANSITION_MIN_DURATION_MS = 500;

export function BuildingShellWithTransition(
  props: BuildingShellProps,
): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), TRANSITION_MIN_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <BuildingShell {...props} />
      <BuildingTransition building={props.name} ready={ready} />
    </>
  );
}
