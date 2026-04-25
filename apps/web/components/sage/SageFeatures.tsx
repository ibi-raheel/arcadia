// Phase 11 · sage overlay for /world.
//
// Mounts inside `GameSquare`. Listens for SQUARE_OPEN_SAGE_EVENT
// (fired by SquareScene when the avatar is in proximity and presses
// ENTER) and opens the React dialogue popup. The popup is fully
// scriptorium-styled — see `SageDialogue.tsx`.
//
// Same pattern as `TavernFeatures` for the tavern feed: poll the
// gameRef every 500 ms until Phaser mounts, then attach a one-shot
// listener that flips local `open` state.

'use client';

import { useEffect, useState } from 'react';

import type { PhaserGameLike } from '@/components/tavern/types';

import { SageDialogue } from './SageDialogue';

const OPEN_EVENT = 'square:open-sage';

type Props = {
  readonly gameRef: React.MutableRefObject<PhaserGameLike | null>;
};

export function SageFeatures({ gameRef }: Props): React.JSX.Element | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let attached = false;
    let listener: (() => void) | null = null;
    const onOpen = (): void => setOpen(true);
    const id = setInterval(() => {
      if (attached) return;
      const game = gameRef.current;
      if (!game) return;
      game.events.on(OPEN_EVENT, onOpen);
      listener = onOpen;
      attached = true;
    }, 500);
    return () => {
      clearInterval(id);
      if (listener) gameRef.current?.events.off(OPEN_EVENT, listener);
    };
  }, [gameRef]);

  if (!open) return null;
  return <SageDialogue onClose={() => setOpen(false)} />;
}
