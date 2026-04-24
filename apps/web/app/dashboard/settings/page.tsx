// `/dashboard/settings` — keeper's keys. Realm basics + profile +
// notification preferences + danger zone. Read-only in Phase 8 — the
// "save" actions come in a follow-up that adds matching server
// actions; for now this surfaces the data a keeper would want to edit
// and stakes out the layout.

'use client';

import {
  BrandMark,
  BronzeButton,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  ScrollCard,
  VellumCard,
  VellumField,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { SETTINGS_FIXTURE, type SettingsData } from '@/lib/fixtures/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

async function loadSettings(): Promise<SettingsData> {
  // Real mode — read what we have (display_name from memberships). The
  // rest of the shape (bio, realm name, notifications) has no backing
  // column yet; return sensible defaults.
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
    notifications: [
      { key: 'new-enrolment', label: 'a new scribe enrols', hint: '—', enabled: false },
      { key: 'lesson-complete', label: 'a scribe finishes a course', hint: '—', enabled: false },
      { key: 'daily-roll', label: "the day's roll", hint: '—', enabled: false },
      { key: 'payout-arrived', label: 'a payout arrives', hint: '—', enabled: false },
      { key: 'tavern-message', label: 'mention in the tavern', hint: '—', enabled: false },
    ],
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
      {loading && <p className="hand on-dark">~ counting ~</p>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <SettingsContent data={data} />}
    </DashboardShell>
  );
}

function SettingsContent({ data }: { readonly data: SettingsData }): React.JSX.Element {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 22,
          marginBottom: 22,
        }}
      >
        <ScrollCard>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <WaxSeal letter={data.realm.seal} />
            <div>
              <Kicker>your realm</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginTop: 2,
                }}
              >
                {data.realm.name}
              </div>
              <Hand>{`~ founded ${data.realm.foundedLabel} ~`}</Hand>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <VellumField label="realm name" defaultValue={data.realm.name} />
            <VellumField label="seal letter" defaultValue={data.realm.seal} />
            <VellumField label="description" defaultValue={data.realm.description} />
            <VellumField label="the tavern&rsquo;s motto" defaultValue={data.realm.tavernMotto} />
          </div>
          <SaveRow />
        </ScrollCard>

        <VellumCard>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <BrandMark letter={data.keeper.avatarInitial} />
            <div>
              <Kicker>your name, if you please</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginTop: 2,
                }}
              >
                {data.keeper.displayName}
              </div>
              <Hand>{`~ ${data.keeper.email} ~`}</Hand>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <VellumField label="display name" defaultValue={data.keeper.displayName} />
            <VellumField label="email" defaultValue={data.keeper.email} disabled />
            <VellumField label="a line about you" defaultValue={data.keeper.bio} />
          </div>
          <SaveRow />
        </VellumCard>
      </div>

      <LedgerCard style={{ marginBottom: 22 }}>
        <Kicker>notes from the lantern</Kicker>
        <div style={{ marginTop: 10 }}>
          {data.notifications.map((n, i) => (
            <div
              key={n.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px dashed rgba(90,63,34,0.25)',
              }}
            >
              <div>
                <div style={{ color: 'var(--ink)', fontSize: 16 }}>{n.label}</div>
                {n.hint !== '—' && <Hand>{`~ ${n.hint} ~`}</Hand>}
              </div>
              <ToggleSwitch on={n.enabled} />
            </div>
          ))}
        </div>
      </LedgerCard>

      <VellumCard
        style={{
          borderLeft: '3px solid var(--wax)',
          marginBottom: 22,
        }}
      >
        <Kicker>wax-sealed · caution</Kicker>
        <h3 style={{ marginTop: 6, color: 'var(--ink)' }}>part ways with the realm</h3>
        <p className="body-italic" style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
          Closes the realm and erases the ledger. This is sealed in wax; a keeper signs it in
          person. The action isn&rsquo;t wired in Phase 8 — it lands with the contracts chapter.
        </p>
        <div style={{ marginTop: 14 }}>
          <WaxButton disabled>seal the door &amp; leave</WaxButton>
        </div>
      </VellumCard>
    </>
  );
}

function SaveRow(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 18,
        paddingTop: 14,
        borderTop: '1px dashed rgba(90,63,34,0.25)',
      }}
    >
      <BronzeButton disabled>seal it</BronzeButton>
      <GhostButton disabled>set aside</GhostButton>
      <span className="hand" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
        ~ saving lands in the next chapter ~
      </span>
    </div>
  );
}

function ToggleSwitch({ on }: { readonly on: boolean }): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'on' : 'off'}
      disabled
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        border: '1px solid var(--bronze)',
        background: on
          ? 'linear-gradient(135deg, var(--lantern-core), var(--lantern))'
          : 'rgba(20, 10, 0, 0.4)',
        position: 'relative',
        cursor: 'not-allowed',
        opacity: 0.85,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 32% 30%, var(--bronze-bright), var(--bronze) 55%, var(--bronze-deep))',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          transition: 'left .2s',
        }}
      />
    </button>
  );
}
