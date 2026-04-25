// Phase 12.A — productivity overlays for the coworking tents.
// Listens for the two ENTER events fired by `CoworkingInsideScene`
// (`coworking:open-jukebox` / `coworking:open-hourglass`),
// subscribes to the per-tent shared state on the Colyseus room
// (`state.jukebox` + `state.pomodoro`), and mounts:
//
//   - <JukeboxOverlay>     — proximity modal, when open
//   - <HourglassOverlay>   — proximity modal, when open
//   - <PomodoroBanner>     — top-centre pill, while a session runs
//   - <HearthPill>         — top-right pill, always while in tent
//
// Pattern mirrors `TavernFeatures` / `SageFeatures` — poll the
// Phaser ref every 500 ms until it mounts, then attach listeners.

'use client';

import { useEffect, useState } from 'react';

import type { ColyseusConnection, ColyseusRoom } from '@/components/game/net/colyseus-client';
import type { PhaserGameLike } from '@/components/tavern/types';

import { HearthPill } from './HearthPill';
import { HourglassOverlay } from './HourglassOverlay';
import { JukeboxAudio } from './JukeboxAudio';
import { JukeboxOverlay } from './JukeboxOverlay';
import { PomodoroBanner } from './PomodoroBanner';

type Props = {
  readonly gameRef: React.MutableRefObject<PhaserGameLike | null>;
  readonly connection: ColyseusConnection | null;
};

export type JukeboxView = {
  readonly playlist: string;
  readonly startedAt: number;
  readonly lastChangedBy: string;
};

export type PomodoroView = {
  readonly phase: 'idle' | 'work' | 'break';
  readonly endsAt: number;
  readonly cycle: number;
  readonly totalCycles: number;
  readonly startedBy: string;
};

const EMPTY_JUKEBOX: JukeboxView = { playlist: '', startedAt: 0, lastChangedBy: '' };
const EMPTY_POMODORO: PomodoroView = {
  phase: 'idle',
  endsAt: 0,
  cycle: 0,
  totalCycles: 0,
  startedBy: '',
};

export function CoworkingFeatures({ gameRef, connection }: Props): React.JSX.Element {
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [hourglassOpen, setHourglassOpen] = useState(false);
  const [jukebox, setJukebox] = useState<JukeboxView>(EMPTY_JUKEBOX);
  const [pomodoro, setPomodoro] = useState<PomodoroView>(EMPTY_POMODORO);
  const [memberCount, setMemberCount] = useState(0);

  // --- Phaser → React event bridge ---
  useEffect(() => {
    let attached = false;
    let onJukebox: (() => void) | null = null;
    let onHourglass: (() => void) | null = null;
    const id = setInterval(() => {
      if (attached) return;
      const game = gameRef.current;
      if (!game) return;
      onJukebox = () => setJukeboxOpen(true);
      onHourglass = () => setHourglassOpen(true);
      game.events.on('coworking:open-jukebox', onJukebox);
      game.events.on('coworking:open-hourglass', onHourglass);
      attached = true;
    }, 500);
    return () => {
      clearInterval(id);
      const game = gameRef.current;
      if (onJukebox) game?.events.off('coworking:open-jukebox', onJukebox);
      if (onHourglass) game?.events.off('coworking:open-hourglass', onHourglass);
    };
  }, [gameRef]);

  // --- Colyseus state subscription ---
  // Lifts state.jukebox / state.pomodoro / avatars.size into React on
  // every server broadcast.
  useEffect(() => {
    if (!connection) return;
    let cancelled = false;
    let detach: (() => void) | null = null;

    const wire = async (room: ColyseusRoom): Promise<void> => {
      const { getStateCallbacks } = await import('colyseus.js');
      if (cancelled) return;
      const $ = getStateCallbacks(room as unknown as Parameters<typeof getStateCallbacks>[0]);

      const readJukebox = (): void => {
        const j = (room.state as unknown as { jukebox: JukeboxView }).jukebox;
        if (!j) return;
        setJukebox({
          playlist: j.playlist,
          startedAt: j.startedAt,
          lastChangedBy: j.lastChangedBy,
        });
      };
      const readPomodoro = (): void => {
        const p = (room.state as unknown as { pomodoro: PomodoroView }).pomodoro;
        if (!p) return;
        setPomodoro({
          phase: p.phase,
          endsAt: p.endsAt,
          cycle: p.cycle,
          totalCycles: p.totalCycles,
          startedBy: p.startedBy,
        });
      };
      const readSize = (): void => {
        setMemberCount((room.state.avatars as unknown as { size: number }).size);
      };

      readJukebox();
      readPomodoro();
      readSize();

      const offJukebox = $((room.state as { jukebox: object }).jukebox).onChange(readJukebox);
      const offPomodoro = $((room.state as { pomodoro: object }).pomodoro).onChange(readPomodoro);
      // avatars MapSchema add/remove → tally.
      $(room.state as unknown as Parameters<typeof getStateCallbacks>[0] /* shape */);
      // any avatar add/remove changes size — re-read on each.
      const avatarsProxy = $(room.state).avatars;
      const offAdd = avatarsProxy.onAdd(() => readSize(), false);
      const offRemove = avatarsProxy.onRemove(() => readSize());

      detach = () => {
        offJukebox();
        offPomodoro();
        offAdd?.();
        offRemove?.();
      };
    };

    const unsubscribe = connection.subscribeConnected((room) => {
      void wire(room);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      detach?.();
    };
  }, [connection]);

  return (
    <>
      <JukeboxAudio jukebox={jukebox} />
      <HearthPill memberCount={memberCount} pomodoro={pomodoro} />
      <PomodoroBanner pomodoro={pomodoro} />
      {jukeboxOpen && (
        <JukeboxOverlay
          jukebox={jukebox}
          connection={connection}
          onClose={() => setJukeboxOpen(false)}
        />
      )}
      {hourglassOpen && (
        <HourglassOverlay
          pomodoro={pomodoro}
          connection={connection}
          onClose={() => setHourglassOpen(false)}
        />
      )}
    </>
  );
}
