// Full-width top HUD bar. Replaces the earlier two-panel layout
// (separate AvatarBadge + XPLevelBadge). The shield anchors the top-
// left corner where the avatar circle used to sit; display name + XP
// track stack to its right; the four placeholder menu icons sit flush
// right.
//
// **Layout role:** this bar lives in the parent's flex flow (no
// `position: fixed`, no screen-edge padding). The Phaser canvas
// claims the remaining height via `flex-1`, so world art never
// renders behind the bar. Modals at z-index 80+ are fixed/inset-0
// over the viewport and still obscure the HUD as before.

'use client';

import { progressToNextLevel } from '@arcadia/shared';

import { MenuIcons } from './MenuIcons';
import { Shield } from './Shield';
import './panel.css';

type Props = {
  readonly displayName: string;
  readonly xp: number;
  /** When false (e.g. while a scene is preloading), the bar reserves
   *  layout space but renders invisible — keeps the Phaser canvas
   *  height stable across the loading → ready transition. Default true. */
  readonly loaded?: boolean;
};

export function PlayerBar({ displayName, xp, loaded = true }: Props): React.JSX.Element {
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
        // In-flow flex item; the parent (each Game* page) is a
        // flex-col container. No fixed-positioning, no screen-edge
        // offsets — the bar is flush across the top.
        flex: '0 0 auto',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        // Reserve layout space during scene preload but stay invisible —
        // prevents the Phaser canvas from resizing when the HUD pops in.
        visibility: loaded ? 'visible' : 'hidden',
      }}
      aria-hidden={!loaded}
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
