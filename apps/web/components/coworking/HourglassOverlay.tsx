// The hourglass proximity modal. Shows the current Pomodoro state
// and lets the caller start / stop / join a session. Server is the
// source of truth; the modal just sends MSG.START_POMODORO /
// MSG.STOP_POMODORO and reads the broadcast back.

'use client';

import { useEffect, useState } from 'react';

import {
  emitOverlayInputBlur,
  emitOverlayInputFocus,
} from '@/components/game/scenes/shared/overlay-input-events';
import type { ColyseusConnection } from '@/components/game/net/colyseus-client';
import {
  BronzeButton,
  Chip,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  WaxButton,
} from '@/components/scriptorium';
import { MSG } from '@arcadia/shared';

import type { PomodoroView } from './CoworkingFeatures';

type Props = {
  readonly pomodoro: PomodoroView;
  readonly connection: ColyseusConnection | null;
  readonly onClose: () => void;
};

const PRESETS: readonly {
  readonly label: string;
  readonly work: number;
  readonly brk: number;
  readonly cycles: number;
}[] = [
  { label: 'classic · 25 / 5 × 4', work: 25, brk: 5, cycles: 4 },
  { label: 'sprint · 50 / 10 × 2', work: 50, brk: 10, cycles: 2 },
  { label: 'deep · 90 / 20 × 1', work: 90, brk: 20, cycles: 1 },
];

export function HourglassOverlay({ pomodoro, connection, onClose }: Props): React.JSX.Element {
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    emitOverlayInputFocus();
    return () => {
      document.removeEventListener('keydown', handler);
      emitOverlayInputBlur();
    };
  }, [onClose]);

  const start = (): void => {
    const room = connection?.getCurrentRoom();
    if (!room) return;
    const p = PRESETS[picked];
    if (!p) return;
    room.send(MSG.START_POMODORO, {
      workMinutes: p.work,
      breakMinutes: p.brk,
      totalCycles: p.cycles,
    });
    onClose();
  };

  const stop = (): void => {
    const room = connection?.getCurrentRoom();
    room?.send(MSG.STOP_POMODORO, {});
    onClose();
  };

  const running = pomodoro.phase !== 'idle';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="the hourglass"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(5, 2, 8, 0.78)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        <ScrollCard style={{ position: 'relative', padding: '26px 28px' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-soft)',
              padding: 8,
              fontSize: 16,
            }}
          >
            ✕
          </button>

          <header style={{ paddingBottom: 14, borderBottom: '1px dashed rgba(90, 63, 34, 0.3)' }}>
            <Kicker>the hourglass</Kicker>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 26,
                margin: '4px 0 0',
                color: 'var(--ink)',
              }}
            >
              {running ? 'a session is running.' : 'open the chest. set a focus block.'}
            </h2>
            <Hand>
              {running
                ? `~ block ${pomodoro.cycle} of ${pomodoro.totalCycles} · ${pomodoro.phase} ~`
                : '~ everyone in this tent shares the same timer ~'}
            </Hand>
          </header>

          {!running && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPicked(i)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    background:
                      i === picked
                        ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.22), rgba(212, 165, 116, 0.08))'
                        : 'rgba(255, 244, 210, 0.55)',
                    border:
                      i === picked
                        ? '1.5px solid var(--lantern)'
                        : '1px solid rgba(90, 63, 34, 0.18)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontSize: 18,
                      }}
                    >
                      {p.label}
                    </span>
                    {i === picked && <Chip variant="gilt">selected</Chip>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <footer
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            {running ? (
              <>
                <GhostButton size="sm" onClick={stop}>
                  end the session
                </GhostButton>
                <BronzeButton size="sm" onClick={onClose}>
                  back to work
                </BronzeButton>
              </>
            ) : (
              <>
                <GhostButton size="sm" onClick={onClose}>
                  set aside
                </GhostButton>
                <WaxButton onClick={start}>start the block</WaxButton>
              </>
            )}
          </footer>
        </ScrollCard>
      </div>
    </div>
  );
}
