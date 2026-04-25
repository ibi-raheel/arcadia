// Top-left HUD: 9-sliced Kenney panel containing a circular avatar
// portrait + the player's display name. The portrait crops the top-
// left frame from `idle.png`. For avatar IDs without a sheet (03–08),
// the circle falls back to the avatar palette colour.

'use client';

import { AVATAR_COLORS, type AvatarId } from '@/components/game/scenes/shared/avatar-palette';
import './panel.css';

type Props = {
  readonly avatarId: AvatarId;
  readonly displayName: string;
};

// Avatars 01 + 02 ship full sprite sheets at /avatars/<id>/idle.png.
// The other six are placeholder colours until art lands.
const AVATARS_WITH_SPRITES: ReadonlySet<AvatarId> = new Set(['avatar-01', 'avatar-02']);

export function AvatarBadge({ avatarId, displayName }: Props): React.JSX.Element {
  const hasSprite = AVATARS_WITH_SPRITES.has(avatarId);
  const fallbackHex = `#${AVATAR_COLORS[avatarId].toString(16).padStart(6, '0')}`;

  return (
    <div
      className="hud-panel"
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 70,
        padding: '6px 14px 6px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 180,
      }}
    >
      <div
        className="hud-avatar-circle"
        style={
          hasSprite
            ? { backgroundImage: `url('/avatars/${avatarId}/idle.png')` }
            : { backgroundColor: fallbackHex }
        }
        aria-label={`avatar ${avatarId}`}
      />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--vellum)',
          letterSpacing: 0.2,
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
      </span>
    </div>
  );
}
