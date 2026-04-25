// Full-width top HUD bar. Replaces the earlier two-panel layout
// (separate AvatarBadge + XPLevelBadge). The shield now anchors the
// top-left corner where the avatar circle used to sit; display name
// + XP track stack to its right; the four placeholder menu icons sit
// flush right.
//
// Stretches across the screen with the same 12 px padding the prior
// pills used. Z-index 70 — modals at 80 still obscure it.

'use client';

import { progressToNextLevel } from '@arcadia/shared';

import { MenuIcons } from './MenuIcons';
import { Shield } from './Shield';
import './panel.css';

type Props = {
  readonly displayName: string;
  readonly xp: number;
};

export function PlayerBar({ displayName, xp }: Props): React.JSX.Element {
  const { level, percent, currentLevelXp, nextLevelXp } = progressToNextLevel(xp);
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
        left: 12,
        right: 12,
        zIndex: 70,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Shield level={level} />

      {/* Name + XP bar stacked. Takes the remaining space between the
          shield and the menu icons. */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxWidth: 360,
        }}
        aria-label={ariaText}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--vellum)',
            letterSpacing: 0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {displayName}
        </span>
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
      </div>

      {/* Spacer — pushes menu icons to the right edge. */}
      <div style={{ flex: 1 }} />

      <MenuIcons />
    </div>
  );
}
