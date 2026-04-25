// Top-right screen-anchored room-status pill. Always visible inside
// a coworking tent; mirrors the position of the sigil banner in the
// PNG art (the banner is decorative; this pill carries the data).
//
// Reads `memberCount` from the avatars MapSchema size and `pomodoro`
// from server state. "in flow" derived: while pomodoro.phase ===
// 'work', everyone in the tent is treated as in flow. This is a
// good-enough approximation until we ship a per-avatar status field
// in 12.B.

'use client';

import type { PomodoroView } from './CoworkingFeatures';

type Props = {
  readonly memberCount: number;
  readonly pomodoro: PomodoroView;
};

export function HearthPill({ memberCount, pomodoro }: Props): React.JSX.Element {
  const inFlow = pomodoro.phase === 'work' ? memberCount : 0;
  const onBreak = pomodoro.phase === 'break' ? memberCount : 0;
  const idle = memberCount - inFlow - onBreak;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 70,
        padding: '8px 14px',
        borderRadius: 20,
        background: 'rgba(5, 2, 8, 0.78)',
        border: '1.5px solid var(--bronze-deep)',
        color: 'var(--vellum)',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13,
        letterSpacing: 0.3,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <span>
        ~ {memberCount} keeper{memberCount === 1 ? '' : 's'}
      </span>
      {inFlow > 0 && <span style={{ color: 'var(--lantern)' }}>· {inFlow} in flow</span>}
      {onBreak > 0 && <span style={{ color: 'var(--verdigris)' }}>· {onBreak} on break</span>}
      {idle > 0 && memberCount > 0 && (
        <span style={{ color: 'var(--vellum-shadow)' }}>· {idle} idle</span>
      )}
      <span> ~</span>
    </div>
  );
}
