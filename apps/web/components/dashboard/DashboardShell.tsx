// Keeper's-studio shell — brand header, 6-tab nav, simulation toggle +
// badge, footer scribe line. Applied once in `app/dashboard/layout.tsx`;
// every tab renders inside it. The tabs match the kit's dashboard kit.
//
// Nav uses scriptorium `<VTag>` with alternating tilt. Active tab is
// lantern-filled.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  BrandMark,
  Desk,
  GhostButton,
  Hand,
  Kicker,
  NightRoom,
  SimulationBadge,
  SimulationToggle,
  TagNav,
} from '@/components/scriptorium';

const TABS = [
  { key: 'studio', label: 'studio', href: '/dashboard' },
  { key: 'courses', label: 'courses', href: '/dashboard/courses' },
  { key: 'events', label: 'events', href: '/dashboard/events' },
  // 2026-04-26: tab labels renamed (HUD wiring) — `folk` → "members"
  // and `payouts` → "billing". Routes kept as-is to avoid migration
  // churn on bookmarks; only the visible tab text changed.
  { key: 'folk', label: 'members', href: '/dashboard/folk' },
  { key: 'payouts', label: 'billing', href: '/dashboard/payouts' },
  { key: 'settings', label: 'settings', href: '/dashboard/settings' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function activeTabFromPath(pathname: string): TabKey {
  // /dashboard → studio · /dashboard/courses... → courses · etc.
  // 2026-04-24: `memberships` + `audience` merged into a single `folk` tab.
  // 2026-04-24 (Phase 9): `events` tab added between courses and folk.
  if (pathname === '/dashboard') return 'studio';
  if (pathname.startsWith('/dashboard/courses')) return 'courses';
  if (pathname.startsWith('/dashboard/events')) return 'events';
  if (pathname.startsWith('/dashboard/folk')) return 'folk';
  if (pathname.startsWith('/dashboard/payouts')) return 'payouts';
  if (pathname.startsWith('/dashboard/settings')) return 'settings';
  return 'studio';
}

type Props = {
  readonly title: ReactNode;
  readonly kicker?: ReactNode;
  readonly tagline?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
};

export function DashboardShell({ title, kicker, tagline, actions, children }: Props) {
  const pathname = usePathname();
  const active = activeTabFromPath(pathname);

  return (
    <NightRoom>
      <SimulationBadge />
      <Desk>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 28,
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <BrandMark letter="A" />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 26,
                  color: 'var(--vellum)',
                  lineHeight: 1,
                }}
              >
                Arcadia
              </div>
              <Hand onDark>~ the keeper&rsquo;s studio ~</Hand>
            </div>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Link href="/world" style={{ textDecoration: 'none' }}>
                <GhostButton size="sm" onDark>
                  ← return to the world
                </GhostButton>
              </Link>
              {/* Logout. `target="_top"` so when the dashboard is opened
                  inside the in-world `DashboardOverlay` iframe, the
                  signout response replaces the *parent* window — both
                  iframe and parent end up on `/` post-redirect, instead
                  of the parent staying authed-looking with stale state. */}
              <form action="/api/auth/signout" method="post" target="_top" style={{ margin: 0 }}>
                <GhostButton size="sm" onDark type="submit">
                  logout
                </GhostButton>
              </form>
            </div>
            <TagNav items={[...TABS]} active={active} />
            <SimulationToggle />
          </div>
        </header>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 20,
          }}
        >
          <div>
            {kicker && <Kicker onDark>{kicker}</Kicker>}
            <h1 style={{ fontSize: 48, margin: 0, lineHeight: 1 }}>{title}</h1>
            {tagline && <Hand onDark>{tagline}</Hand>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
        </div>

        {children}

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px dashed var(--bronze)',
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--vellum-shadow)',
          }}
        >
          ~ kept by the scribe · refreshed a moment ago ~
        </div>
      </Desk>
    </NightRoom>
  );
}
