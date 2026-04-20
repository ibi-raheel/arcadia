// Right-docked XP leaderboard. Initial fetch pulls the top 10 of the
// current realm; Realtime subscription on memberships re-sorts in-place
// when any member's xp changes. Phase 2 ships this scaffold — every
// member's XP stays at 0 until Phase 5 wires the award triggers.

'use client';

import { useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import type { LeaderboardEntry } from './types';

const LIMIT = 10;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: LeaderboardEntry[] };

type Props = {
  readonly realmId: string;
  readonly memberId: string;
};

export function LeaderboardPanel({ realmId, memberId }: Props): React.JSX.Element {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [collapsed, setCollapsed] = useState(false);
  const entriesRef = useRef<LeaderboardEntry[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('member_id, display_name, xp, level')
        .eq('realm_id', realmId)
        .order('xp', { ascending: false })
        .limit(LIMIT);
      if (cancelled) return;
      if (error) {
        setState({ status: 'error', message: error.message });
        return;
      }
      const entries = (data ?? []) as LeaderboardEntry[];
      entriesRef.current = entries;
      setState({ status: 'ready', entries });
    })();

    const channel = supabase
      .channel(`leaderboard-${realmId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'memberships',
          filter: `realm_id=eq.${realmId}`,
        },
        (payload) => {
          const row = payload.new as LeaderboardEntry;
          // Upsert the changed row into the cached top-10, then re-sort +
          // re-slice. Rows outside the top 10 are re-fetched lazily — if an
          // UPDATE arrives for a member not in the cache but their new xp
          // beats the tenth entry, we need the rest of the top 10. For
          // Phase 2 MVP the upsert is enough; Phase 5 may revisit.
          const existing = entriesRef.current.findIndex((e) => e.member_id === row.member_id);
          let next: LeaderboardEntry[];
          if (existing >= 0) {
            next = entriesRef.current.map((e, i) => (i === existing ? { ...e, ...row } : e));
          } else if (
            entriesRef.current.length < LIMIT ||
            row.xp > (entriesRef.current.at(-1)?.xp ?? 0)
          ) {
            next = [...entriesRef.current, row];
          } else {
            return;
          }
          next.sort((a, b) => b.xp - a.xp);
          next = next.slice(0, LIMIT);
          entriesRef.current = next;
          setState({ status: 'ready', entries: next });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [realmId]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto absolute right-4 top-16 z-30 rounded bg-neutral-900/80 px-3 py-2 text-sm text-neutral-100 shadow hover:bg-neutral-900"
      >
        🏆 Top 10
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-4 top-16 z-30 w-56 rounded-lg border border-neutral-800 bg-neutral-900/92 text-sm text-neutral-100 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="font-medium tracking-tight">🏆 Top 10</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-neutral-500 hover:text-neutral-200"
          aria-label="Collapse leaderboard"
        >
          ×
        </button>
      </div>
      <ol className="divide-y divide-neutral-800">
        {state.status === 'loading' && <li className="px-3 py-2 text-neutral-500">Loading…</li>}
        {state.status === 'error' && <li className="px-3 py-2 text-red-400">{state.message}</li>}
        {state.status === 'ready' && state.entries.length === 0 && (
          <li className="px-3 py-2 text-neutral-500">No members yet.</li>
        )}
        {state.status === 'ready' &&
          state.entries.map((e, idx) => (
            <li
              key={e.member_id}
              className={`flex items-center justify-between px-3 py-1.5 ${
                e.member_id === memberId ? 'bg-neutral-800/40' : ''
              }`}
            >
              <span className="truncate">
                <span className="mr-1 text-xs text-neutral-500">{idx + 1}.</span>
                {e.display_name}
              </span>
              <span className="shrink-0 text-xs text-neutral-400">
                Lv {e.level} · {e.xp} XP
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}
