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
  // every server broadcast. Uses room.onStateChange (catch-all on every
  // diff) instead of getStateCallbacks per-field — more reliable for
  // nested Schema fields and simpler to reason about.
  useEffect(() => {
    if (!connection) return;
    let detach: (() => void) | null = null;

    const wire = (room: ColyseusRoom): void => {
      const readAll = (): void => {
        const state = room.state as unknown as {
          jukebox?: JukeboxView;
          pomodoro?: PomodoroView;
          avatars?: { size: number };
        };
        if (state.jukebox) {
          setJukebox({
            playlist: state.jukebox.playlist ?? '',
            startedAt: state.jukebox.startedAt ?? 0,
            lastChangedBy: state.jukebox.lastChangedBy ?? '',
          });
        }
        if (state.pomodoro) {
          setPomodoro({
            phase: (state.pomodoro.phase ?? 'idle') as PomodoroView['phase'],
            endsAt: state.pomodoro.endsAt ?? 0,
            cycle: state.pomodoro.cycle ?? 0,
            totalCycles: state.pomodoro.totalCycles ?? 0,
            startedBy: state.pomodoro.startedBy ?? '',
          });
        }
        setMemberCount(state.avatars?.size ?? 0);
      };

      // Read once now (covers the case where state was already
      // populated before the listener attached) + subscribe to every
      // future server diff. Colyseus 0.16's onStateChange fires on
      // any nested mutation, including Schema-on-Schema updates.
      readAll();
      const off = (
        room as unknown as { onStateChange: (cb: () => void) => () => void }
      ).onStateChange(readAll);
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
