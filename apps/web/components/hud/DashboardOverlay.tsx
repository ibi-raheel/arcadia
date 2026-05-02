// Dashboard-as-overlay. Each creator HUD icon opens the matching
// dashboard tab in a full-screen modal layered over `/world` (or
// whichever scene the user is on) instead of doing a client-side
// route change. Two reasons:
//   1. The persistent ambient music (mounted in the root layout)
//      keeps playing — we never leave the current page.
//   2. The Phaser canvas + Colyseus connection don't tear down,
//      so re-entering the world after closing the overlay is
//      instant; no scene-load cost, no dropped multiplayer state.
//
// Implementation: an `<iframe>` pointing at the dashboard tab URL.
// Same-origin so cookies + auth flow normally. The dashboard pages
// stay as standalone routes for direct URL access (SEO, bookmarks);
// this just adds a second way to reach them that's compatible with
// the in-world experience.

'use client';

import { useEffect } from 'react';

export type DashboardTab = 'courses' | 'events' | 'members' | 'billing' | 'settings';

const TAB_ROUTES: Record<DashboardTab, string> = {
  courses: '/dashboard/courses',
  events: '/dashboard/events',
  // Routes stay at `/dashboard/folk` and `/dashboard/payouts`; only the
  // user-facing tab labels say "members" / "billing" (per the rename
  // in PR #55 / DashboardShell).
  members: '/dashboard/folk',
  billing: '/dashboard/payouts',
  settings: '/dashboard/settings',
};

const TAB_TITLES: Record<DashboardTab, string> = {
  courses: 'Courses',
  events: 'Events',
  members: 'Members',
  billing: 'Billing',
  settings: 'Settings',
};

type Props = {
  /** Which tab to show. `null` = closed (no overlay rendered). */
  readonly tab: DashboardTab | null;
  readonly onClose: () => void;
};

export function DashboardOverlay({ tab, onClose }: Props): React.JSX.Element | null {
  // Esc dismisses.
  useEffect(() => {
    if (!tab) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tab, onClose]);

  if (!tab) return null;

  const src = TAB_ROUTES[tab];
  const title = TAB_TITLES[tab];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} dashboard`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(5, 2, 8, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: 1480,
          background: 'var(--night, #050208)',
          borderRadius: 8,
          border: '1px solid rgba(212, 165, 116, 0.45)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dashboard"
          title="Close (Esc)"
          style={closeButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gilt, #e7c66c)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--bronze-bright, #d4a868)')}
        >
          ✕
        </button>
        <iframe
          src={src}
          title={`${title} dashboard`}
          // `key={tab}` so switching tabs while the overlay is open
          // forces a fresh iframe (rather than navigating within the
          // existing one — the dashboard's own back/forward would
          // leak into the parent's history otherwise).
          key={tab}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background: 'var(--night, #050208)',
          }}
        />
      </div>
    </div>
  );
}

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 1,
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(20, 10, 5, 0.85)',
  border: '1px solid rgba(212, 165, 116, 0.55)',
  borderRadius: 4,
  color: 'var(--bronze-bright, #d4a868)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
  transition: 'color 120ms ease-out',
};
