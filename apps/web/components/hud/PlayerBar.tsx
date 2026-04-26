// Full-width top HUD bar — three equal flex sections:
//   [ left: shield + name + xp ] [ middle: ─ location ─ ] [ right: menu icons ]
// Each section is `flex: 1 1 0; min-width: 0` so they're guaranteed
// thirds at any viewport width. Right-section icons shrink on narrow
// viewports via media queries in panel.css so they can't crowd the
// left section's name/XP bar (was a real bug on phone before the
// 3-section split).
//
// Lives in the parent's flex flow (no `position: fixed`, no
// screen-edge padding). Phaser canvas claims the remaining height
// via `flex-1`. Modals at z-index 80+ still obscure the HUD.

'use client';

import { progressToNextLevel } from '@arcadia/shared';

import { MenuIcons } from './MenuIcons';
import { Shield } from './Shield';
import './panel.css';

type Props = {
  readonly displayName: string;
  readonly xp: number;
  readonly location: string;
  /** When false (e.g. while a scene is preloading), the bar reserves
   *  layout space but renders invisible — keeps the Phaser canvas
   *  height stable across the loading → ready transition. Default true. */
  readonly loaded?: boolean;
};

export function PlayerBar({ displayName, xp, location, loaded = true }: Props): React.JSX.Element {
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
        flex: '0 0 auto',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        visibility: loaded ? 'visible' : 'hidden',
      }}
      aria-hidden={!loaded}
    >
      {/* LEFT 1/3 — shield + name + xp bar (unchanged internals). */}
      <div className="hud-section hud-section-left" aria-label={ariaText}>
        <Shield level={level} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span className="hud-name">{displayName}</span>
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
      </div>

      {/* MIDDLE 1/3 — `── Location ──`. The dividers `flex: 1` so they
          fill the space on either side of the centred label. */}
      <div className="hud-section hud-section-middle" aria-label={`location: ${location}`}>
        <img src="/hud/kenney/divider-bronze.png" alt="" className="hud-divider" />
        <span className="hud-location">{location}</span>
        <img src="/hud/kenney/divider-bronze.png" alt="" className="hud-divider" />
      </div>

      {/* RIGHT 1/3 — menu icons, justify-end so they sit flush right. */}
      <div className="hud-section hud-section-right">
        <MenuIcons />
      </div>
    </div>
  );
}
