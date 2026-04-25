// Top-right menu — four placeholder icon buttons (Profile, Quests,
// Events, Settings). Inline SVGs in the same drawing style as the
// Shield: pixel-art-flavoured strokes on `currentColor`, themeable
// via `.hud-icon-btn` (`color` token). No click handlers yet — all
// four are placeholders flagged with `aria-label` so the wiring is
// trivial when the routes land.

'use client';

import './panel.css';

type IconProps = { readonly size?: number };

function ProfileIcon({ size = 18 }: IconProps): React.JSX.Element {
  // Head + shoulders silhouette.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.5" r="3.2" stroke="currentColor" strokeWidth={1.6} />
      <path
        d="M3.5 17.5C3.5 13.9 6.4 12 10 12C13.6 12 16.5 13.9 16.5 17.5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuestsIcon({ size = 18 }: IconProps): React.JSX.Element {
  // Rolled scroll with two horizontal text rules.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 4H14C14.55 4 15 4.45 15 5V15C15 16.1 15.9 17 17 17H6C4.9 17 4 16.1 4 15V5C4 4.45 4.45 4 5 4Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M7 8H12" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M7 11H12" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function EventsIcon({ size = 18 }: IconProps): React.JSX.Element {
  // Calendar grid with binding rings.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="13"
        height="11.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path d="M3.5 9H16.5" stroke="currentColor" strokeWidth={1.4} />
      <path d="M7 3.5V6" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M13 3.5V6" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx="7" cy="12" r="0.9" fill="currentColor" />
      <circle cx="10" cy="12" r="0.9" fill="currentColor" />
      <circle cx="13" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon({ size = 18 }: IconProps): React.JSX.Element {
  // Eight-tooth gear with hub.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5L11 4.5L13 4L13.5 6L15.5 6.5L15 8.5L17 9.5L16 11.5L17 13.5L15 14.5L15.5 16.5L13.5 17L13 19L11 18.5L10 20L9 18.5L7 19L6.5 17L4.5 16.5L5 14.5L3 13.5L4 11.5L3 9.5L5 8.5L4.5 6.5L6.5 6L7 4L9 4.5L10 2.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10.5" r="2.4" stroke="currentColor" strokeWidth={1.4} />
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
