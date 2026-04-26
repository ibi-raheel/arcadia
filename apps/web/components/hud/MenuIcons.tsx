// Top-right menu — role-aware. Members get the "what's around me" set
// (Profile, Chat, Quests, Events, Settings); creators + admins get the
// creator-tooling set (Courses, Events, Members, Billing, Settings).
//
// All icons are inline filled SVGs in the same drawing style as the
// Shield: cut-out detail bands for contrast, themeable via
// `.hud-icon-btn` (`color` token). No click handlers yet — wire to
// real routes when those land.

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

function ChatIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled speech bubble with a bottom-left tail and three darker dots
  // for the "messages" affordance.
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M3.5 4H16.5C17.05 4 17.5 4.45 17.5 5V12.5C17.5 13.05 17.05 13.5 16.5 13.5H8.2L5.4 16.7C5.1 17.05 4.5 16.84 4.5 16.4V13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V5C2.5 4.45 2.95 4 3.5 4Z"
        fill="currentColor"
      />
      <circle cx="6.8" cy="8.75" r="1" fill="rgba(0,0,0,0.45)" />
      <circle cx="10" cy="8.75" r="1" fill="rgba(0,0,0,0.45)" />
      <circle cx="13.2" cy="8.75" r="1" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}

function QuestsIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Filled scroll with two darker text bands cut out of it.
  // (Reused as the "Courses" icon in the creator set.)
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

function MembersIcon({ size = 28 }: IconProps): React.JSX.Element {
  // List glyph — three horizontal rows with bullet dots on the left.
  // (User's fallback after the multi-silhouette didn't read at small
  // sizes; "list" reads cleanly as "the folk in your realm".)
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="4.2" cy="6" r="1.2" fill="currentColor" />
      <rect x="7.2" y="5.1" width="10" height="1.8" rx="0.6" fill="currentColor" />
      <circle cx="4.2" cy="10" r="1.2" fill="currentColor" />
      <rect x="7.2" y="9.1" width="10" height="1.8" rx="0.6" fill="currentColor" />
      <circle cx="4.2" cy="14" r="1.2" fill="currentColor" />
      <rect x="7.2" y="13.1" width="10" height="1.8" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function BillingIcon({ size = 28 }: IconProps): React.JSX.Element {
  // Single coin with a prominent $ glyph centred. Earlier "stack of
  // coins" version read as flat ellipses at small sizes and the $
  // was almost invisible (font-size 3).
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="7.2" fill="currentColor" />
      <circle cx="10" cy="10" r="6" fill="rgba(0,0,0,0.4)" />
      <text
        x="10"
        y="13.6"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
      >
        $
      </text>
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

type IconEntry = {
  readonly id: string;
  readonly label: string;
  readonly Icon: (props: IconProps) => React.JSX.Element;
};

/** Member view: identity + social + activity + personal settings. */
const MEMBER_ICONS: ReadonlyArray<IconEntry> = [
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'quests', label: 'Quests', Icon: QuestsIcon },
  { id: 'events', label: 'Events', Icon: EventsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

/** Creator / admin view: the studio's day-to-day tools. */
const CREATOR_ICONS: ReadonlyArray<IconEntry> = [
  { id: 'courses', label: 'Courses', Icon: QuestsIcon }, // scroll re-used
  { id: 'events', label: 'Events', Icon: EventsIcon },
  { id: 'members', label: 'Members', Icon: MembersIcon },
  { id: 'billing', label: 'Billing', Icon: BillingIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export type HudRole = 'member' | 'creator' | 'admin';

type Props = {
  /** Picks the icon set: 'member' → MEMBER_ICONS; 'creator'/'admin' → CREATOR_ICONS. */
  readonly role?: HudRole;
};

export function MenuIcons({ role = 'member' }: Props): React.JSX.Element {
  const icons = role === 'member' ? MEMBER_ICONS : CREATOR_ICONS;
  return (
    <div className="hud-icon-row">
      {icons.map(({ id, label, Icon }) => (
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
