// `/dashboard/folk` — merged memberships + audience. The keeper's roll
// of everyone in the realm: paying subs + non-paying visitors, with
// their role (scribe / keeper / wanderer), enrolments, XP + level,
// streak, and last-seen. KPI strip at top covers the memberships-tab
// headlines (paying / total / new / churn-risk).
//
// Client component because useFetchOrMock needs to respond to the
// simulation toggle.

'use client';

import {
  Avatar,
  Chip,
  EnvelopeCard,
  Hand,
  Kicker,
  LedgerCard,
  VellumCard,
} from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { FOLK_FIXTURE, type FolkData, type FolkMember } from '@/lib/fixtures/folk';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

async function loadFolk(): Promise<FolkData> {
  // Real mode — Supabase has `memberships` rows with display_name,
  // role, xp, level. No last-seen / streak / enrolment-count aggregates
  // yet; those fields read 0 / "—" until a follow-up migration adds
  // tracking.
  const supabase = getSupabaseBrowserClient();
  const { data: rows } = await supabase
    .from('memberships')
    .select('member_id, display_name, role, xp, level')
    .order('xp', { ascending: false })
    .limit(50);

  const members: FolkMember[] = (rows ?? []).map((r, i) => ({
    id: String(r.member_id ?? i),
    name: (r.display_name ?? 'someone') as string,
    seal: ((r.display_name as string | null) ?? 'A').charAt(0).toUpperCase(),
    role: (r.role as FolkMember['role']) ?? 'wanderer',
    enrolmentCount: 0,
    xp: Number(r.xp ?? 0),
    level: Number(r.level ?? 1),
    streakDays: 0,
    lastSeen: '—',
  }));

  const payingCount = members.filter((m) => m.role === 'scribe' || m.role === 'keeper').length;

  return {
    totalPaying: payingCount,
    totalFolk: members.length,
    newThisWeek: 0,
    churnRisk: 0,
    members,
  };
}

export default function FolkPage(): React.JSX.Element {
  const { data, loading, error } = useFetchOrMock<FolkData>(loadFolk, FOLK_FIXTURE);

  return (
    <DashboardShell
      kicker="the guild roll"
      title={
        <>
          your <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>folk</em>.
        </>
      }
      tagline="~ who's paid, who's stayed, who's drifted ~"
    >
      {loading && <p className="hand on-dark">~ counting ~</p>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <FolkContent data={data} />}
    </DashboardShell>
  );
}

function FolkContent({ data }: { readonly data: FolkData }): React.JSX.Element {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <KpiEnvelope label="paying folk" value={`${data.totalPaying}`} hint="scribes + keepers" />
        <KpiEnvelope label="all folk" value={`${data.totalFolk}`} hint="everyone in the realm" />
        <KpiEnvelope label="new · 7d" value={`${data.newThisWeek}`} hint="arrived this week" />
        <KpiEnvelope
          label="gone quiet"
          value={`${data.churnRisk}`}
          hint="unseen &gt; 14 days"
          variant="wax"
        />
      </div>

      <LedgerCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Kicker>the roll</Kicker>
          <Hand>~ newest → quietest, by last seen ~</Hand>
        </div>
        <MembersTable members={data.members} />
      </LedgerCard>

      <VellumCard style={{ marginTop: 22 }}>
        <Kicker>writing to folk</Kicker>
        <p className="body-italic" style={{ marginTop: 10, color: 'var(--ink)' }}>
          Sending notes to this roll isn&rsquo;t wired yet — the outgoing missive tray arrives in a
          later chapter. For now, the list above is what&rsquo;s known.
        </p>
      </VellumCard>
    </>
  );
}

function KpiEnvelope({
  label,
  value,
  hint,
  variant = 'envelope',
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly variant?: 'envelope' | 'wax';
}): React.JSX.Element {
  const color = variant === 'wax' ? 'var(--crimson)' : 'var(--vellum)';
  return (
    <EnvelopeCard>
      <Kicker>{label}</Kicker>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 40,
          color,
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <Hand onDark>{`~ ${hint} ~`}</Hand>
    </EnvelopeCard>
  );
}

function RoleChip({ role }: { readonly role: FolkMember['role'] }): React.JSX.Element {
  if (role === 'keeper') return <Chip variant="wax">keeper</Chip>;
  if (role === 'scribe') return <Chip>scribe</Chip>;
  return <Chip variant="verdigris">wanderer</Chip>;
}

function MembersTable({ members }: { readonly members: readonly FolkMember[] }): React.JSX.Element {
  return (
    <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th>scribe</Th>
          <Th>role</Th>
          <Th>enrolments</Th>
          <Th>level · xp</Th>
          <Th>streak</Th>
          <Th>last seen</Th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
            <Td>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Avatar letter={m.seal} />
                <span style={{ color: 'var(--ink)' }}>{m.name}</span>
              </span>
            </Td>
            <Td>
              <RoleChip role={m.role} />
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)' }}>
                {m.enrolmentCount}
              </span>
            </Td>
            <Td>
              <span style={{ color: 'var(--ink)' }}>
                {m.level}
                <span className="mono" style={{ color: 'var(--ink-faint)', marginLeft: 6 }}>
                  · {m.xp} xp
                </span>
              </span>
            </Td>
            <Td>
              {m.streakDays === 0 ? (
                <span style={{ color: 'var(--ink-quiet)' }}>—</span>
              ) : (
                <span
                  className="mono"
                  style={{ color: 'var(--oxblood)', fontWeight: 500 }}
                >{`${m.streakDays}d`}</span>
              )}
            </Td>
            <Td>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--ink)' }}>{m.lastSeen}</span>
                {m.note && <Hand>{m.note}</Hand>}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '10px',
        fontFamily: 'var(--font-caps)',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'var(--bronze-deep)',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <td style={{ padding: '10px', fontFamily: 'var(--font-body)', fontSize: 15 }}>{children}</td>
  );
}
