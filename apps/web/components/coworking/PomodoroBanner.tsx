// Top-centre screen-anchored banner. Visible only while a session
// is running. Lantern italic during work phases, verdigris italic
// during break phases. Counts down to `endsAt`.
//
// `endsAt` ticks visually at 1 Hz client-side; the server is the
// source of truth for phase transitions (server clock fires
// `tickPomodoro` every second and the broadcast updates this view).

'use client';

import { useEffect, useState } from 'react';

import type { PomodoroView } from './CoworkingFeatures';

type Props = {
  readonly pomodoro: PomodoroView;
};

export function PomodoroBanner({ pomodoro }: Props): React.JSX.Element | null {
  const [now, setNow] = useState<number>(() => Date.now());

  // 1 Hz visual tick. We don't read from server every second — the
  // server broadcasts on phase change; in-between we just count
  // down locally.
  useEffect(() => {
    if (pomodoro.phase === 'idle') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pomodoro.phase]);

  if (pomodoro.phase === 'idle') return null;

  const remainingMs = Math.max(0, pomodoro.endsAt - now);
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const time = `${mm}:${String(ss).padStart(2, '0')}`;

  const isWork = pomodoro.phase === 'work';
  const accent = isWork ? 'var(--lantern)' : 'var(--verdigris)';
  const label = isWork ? 'deep work' : 'stretch';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        // 100 — leaves ~36 px below the HUD bar (bar is ~64 px tall).
        position: 'fixed',
        top: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        padding: '8px 18px',
        borderRadius: 24,
        background: 'rgba(5, 2, 8, 0.85)',
        border: `1.5px solid ${accent}`,
        color: accent,
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 16,
        letterSpacing: 0.4,
        boxShadow: `0 6px 18px rgba(0, 0, 0, 0.55), 0 0 14px ${accent}33`,
        whiteSpace: 'nowrap',
      }}
    >
      ~ {label} · {time} ~
      <span
        className="mono"
        style={{
          marginLeft: 10,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: 'var(--vellum-shadow)',
          fontStyle: 'normal',
        }}
      >
        block {pomodoro.cycle} / {pomodoro.totalCycles}
      </span>
    </div>
  );
}
