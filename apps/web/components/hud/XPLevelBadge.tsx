// Top-right HUD: 9-sliced Kenney panel containing the XP progress
// bar (current level → next level threshold) and a heraldic SVG
// shield with the level number centred. No "Lvl" text — the shape
// signals what it is.

'use client';

import { progressToNextLevel } from '@arcadia/shared';

import { Shield } from './Shield';
import './panel.css';

type Props = {
  readonly xp: number;
};

export function XPLevelBadge({ xp }: Props): React.JSX.Element {
  const { level, percent, nextLevelXp, currentLevelXp } = progressToNextLevel(xp);
  const widthPct = Math.round(percent * 100);
  const ariaText =
    nextLevelXp === null
      ? `level ${level}, max level reached`
      : `level ${level}, ${xp - currentLevelXp} of ${nextLevelXp - currentLevelXp} XP to next level`;

  return (
    <div
      className="hud-panel"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 70,
        padding: '6px 8px 6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
      aria-label={ariaText}
    >
      <div
        className="hud-xp-track"
        role="progressbar"
        aria-valuenow={widthPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="hud-xp-fill"
          data-full={percent >= 1 ? 'true' : 'false'}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <Shield level={level} />
    </div>
  );
}
