// `/dashboard/folk` — merged memberships + audience. The keeper's roll
// of everyone in the realm: paying subs + non-paying visitors, plus the
// MRR composition block, tier editor, retention curves, at-risk list,
// growth panels — all in one surface.
//
// Visual composition lives in `_components/FolkContent.tsx` so the
// public `/preview/folk` route can render the same UI against fixture
// data without pulling in the Supabase client.
//
// Client component because useFetchOrMock needs to respond to the
// simulation toggle.

'use client';

import { Hand, LedgerCard } from '@/components/scriptorium';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { FOLK_FIXTURE, type FolkData, type FolkMember } from '@/lib/fixtures/folk';
import { useFetchOrMock } from '@/lib/fetch-or-mock';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { FolkContent } from './_components/FolkContent';

async function loadFolk(): Promise<FolkData> {
  // Real mode — Supabase has `memberships` rows with display_name,
  // role, xp, level. No last-seen / streak / enrolment-count aggregates
  // yet; those fields read 0 / "—" until a follow-up migration adds
  // tracking. MRR + tier composition come from a future migration; for
  // now we surface zeroes on the real-mode MRRBlock rather than silently
  // borrowing the fixture.
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
    money: { mrr: 0, mrrDelta: 0 },
    tiers: [],
    retentionCurves: [],
    atRisk: [],
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
      {loading && <Hand onDark>~ counting ~</Hand>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <FolkContent data={data} />}
    </DashboardShell>
  );
}
