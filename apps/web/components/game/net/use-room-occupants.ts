// Live count of avatars in the current Colyseus room.
//
// Subscribes via `connection.subscribeConnected(room => room.onStateChange)` —
// the same catch-all pattern CoworkingFeatures uses for jukebox / pomodoro /
// avatars.size. Onstatechange fires on every server diff (including
// MapSchema add/remove on `state.avatars`), so the count tracks joins +
// leaves in real time.
//
// Returns 1 when no connection is provided (covers single-player outdoor
// scenes where the player is always alone). Returns 0 transiently while
// the room is connecting and state hasn't arrived yet.

'use client';

import { useEffect, useState } from 'react';

import type { ColyseusConnection, ColyseusRoom } from './colyseus-client';

export function useRoomOccupants(connection: ColyseusConnection | null | undefined): number {
  const [count, setCount] = useState(connection ? 0 : 1);

  useEffect(() => {
    if (!connection) {
      setCount(1);
      return;
    }
    let detach: (() => void) | null = null;

    const wire = (room: ColyseusRoom): void => {
      const read = (): void => {
        const state = room.state as unknown as { avatars?: { size: number } };
        setCount(state.avatars?.size ?? 0);
      };
      read();
      const off = (
        room as unknown as { onStateChange: (cb: () => void) => () => void }
      ).onStateChange(read);
      detach = off;
    };

    const unsubscribe = connection.subscribeConnected((room) => {
      wire(room);
    });

    return () => {
      unsubscribe();
      detach?.();
    };
  }, [connection]);

  return count;
}
