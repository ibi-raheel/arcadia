// `/dashboard/settings` — the keeper's keys. Six sections in a sidebar
// + scroll layout: keeper, realm, notifications, billing, integrations,
// security. Visual composition lives in `_components/SettingsContent.tsx`
// so the auth-gated route and `/preview/settings` render identical UI.

'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, LedgerCard } from '@/components/scriptorium';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { SETTINGS_FIXTURE, type SettingsData } from '@/lib/fixtures/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { SettingsContent } from './_components/SettingsContent';

async function loadSettings(): Promise<SettingsData> {
  // Real mode — we have `display_name` from memberships. Everything
  // else (realm metadata, notification prefs, billing, integrations,
  // security sessions) has no backing table yet; show sensible
  // placeholders so the keeper sees the shape of each section.
  const supabase = getSupabaseBrowserClient();
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email ?? '';
  const { data: membership } = await supabase
    .from('memberships')
    .select('display_name')
    .eq('member_id', user.user?.id ?? '')
    .maybeSingle();

  const display = (membership?.display_name as string | null) ?? 'your keeper name';

  return {
    realm: {
      name: 'your realm',
      seal: display.charAt(0).toUpperCase(),
      foundedLabel: '—',
      description: '—',
      tavernMotto: '—',
    },
    keeper: {
      displayName: display,
      email,
      bio: '—',
      avatarInitial: display.charAt(0).toUpperCase(),
    },
    notifications: SETTINGS_FIXTURE.notifications.map((n) => ({
      ...n,
      email: false,
      push: false,
    })),
    // Billing / integrations / security need third-party wiring; show
    // the shape but mark everything disabled/empty until those ship.
    billing: {
      ...SETTINGS_FIXTURE.billing,
      invoices: [],
      plans: SETTINGS_FIXTURE.billing.plans.map((p, i) => ({
        ...p,
        current: i === 0,
        cta: i === 0 ? 'current plan' : 'step up',
      })),
    },
    integrations: SETTINGS_FIXTURE.integrations.map((t) => ({ ...t, status: 'coming-soon' })),
    security: {
      twoFactorEnabled: false,
      lastLogin: { when: 'just now', from: 'this session' },
      sessions: [
        {
          id: 'current',
          device: 'this browser',
          where: '—',
          lastSeen: 'now',
          current: true,
        },
      ],
    },
  };
}

export default function SettingsPage(): React.JSX.Element {
  const { data, loading, error } = useFetchOrMock<SettingsData>(loadSettings, SETTINGS_FIXTURE);

  return (
    <DashboardShell
      kicker="settings"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>keeper&rsquo;s keys</em>.
        </>
      }
      tagline="~ the room itself · your name, your realm, the kettle ~"
    >
      {loading && <Hand onDark>~ counting ~</Hand>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <SettingsContent data={data} />}
    </DashboardShell>
  );
}
