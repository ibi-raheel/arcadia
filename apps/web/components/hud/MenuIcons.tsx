// Top-right menu — four placeholder icon buttons (Profile, Quests,
// Events, Settings). Inline SVGs in the same drawing style as the
// Shield: pixel-art-flavoured strokes on `currentColor`, themeable
// via `.hud-icon-btn` (`color` token). No click handlers yet — all
// four are placeholders flagged with `aria-label` so the wiring is
// trivial when the routes land.

'use client';

import './panel.css';

type IconProps = { readonly size?: number };

function ProfileIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled head + shoulders silhouette.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="6.5" r="3.4" fill="currentColor" />
      <path d="M3 17.5C3 13.6 6.1 11.5 10 11.5C13.9 11.5 17 13.6 17 17.5Z" fill="currentColor" />
    </svg>
  );
}

function QuestsIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled scroll with two darker text bands cut out of it.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M4.5 3.5H14C14.55 3.5 15 3.95 15 4.5V14.5C15 15.6 15.9 16.5 17 16.5H6C4.9 16.5 4 15.6 4 14.5V4C4 3.72 4.22 3.5 4.5 3.5Z"
        fill="currentColor"
      />
      <rect x="6.5" y="6.5" width="6" height="1.4" rx="0.5" fill="rgba(0,0,0,0.45)" />
      <rect x="6.5" y="9.4" width="6" height="1.4" rx="0.5" fill="rgba(0,0,0,0.45)" />
      <rect x="6.5" y="12.3" width="4" height="1.4" rx="0.5" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}

function EventsIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled calendar with darker grid cells.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <rect x="3" y="5" width="14" height="12" rx="1.5" fill="currentColor" />
      <rect x="3" y="5" width="14" height="3.2" fill="rgba(0,0,0,0.35)" />
      <rect x="6.4" y="3" width="1.4" height="3.4" rx="0.6" fill="currentColor" />
      <rect x="12.2" y="3" width="1.4" height="3.4" rx="0.6" fill="currentColor" />
      <circle cx="7" cy="12" r="1" fill="rgba(0,0,0,0.45)" />
      <circle cx="10" cy="12" r="1" fill="rgba(0,0,0,0.45)" />
      <circle cx="13" cy="12" r="1" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}

function SettingsIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled eight-tooth gear with a punched-out hub.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 1.5L11.4 4L13.8 3.4L14.4 5.8L16.8 6.4L16.2 8.8L18.5 10L17.2 12L18 14.4L15.6 15L15 17.4L12.6 16.8L11 19L10 17L9 19L7.4 16.8L5 17.4L4.4 15L2 14.4L2.8 12L1.5 10L3.8 8.8L3.2 6.4L5.6 5.8L6.2 3.4L8.6 4L10 1.5Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <circle cx="10" cy="10" r="2.6" fill="rgba(0,0,0,0.55)" />
    </svg>
  );
}

const ICONS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly Icon: (props: IconProps) => React.JSX.Element;
}> = [
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'quests', label: 'Quests', Icon: QuestsIcon },
  { id: 'events', label: 'Events', Icon: EventsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export function MenuIcons(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {ICONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="hud-icon-btn"
          aria-label={label}
          title={label}
          // Placeholders — wired up in a follow-up phase.
          onClick={() => {
            /* no-op: placeholder */
          }}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
