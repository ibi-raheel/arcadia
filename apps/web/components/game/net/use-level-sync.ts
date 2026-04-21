// Phase 5 Step 4 — level-up plumbing.
//
// Subscribes to the caller's own `memberships` row via Supabase Realtime.
// On a level delta (new.level !== old.level), two things happen:
//   1. `eventBus.emit('level-up', newLevel)` → LevelUpBanner listens and
//      animates a React portal overlay for ~2s.
//   2. If a Colyseus room is connected, sends `MSG.UPDATE_LEVEL { level }`
//      so the server-side AvatarState + every peer in that room gets
//      the new level badge without querying Supabase themselves.
//
// TAD §8.3. Server source of truth is `memberships.level`, updated by
// the lesson-completion trigger (migration 20260422000002). This hook
// is the client mirror — it never writes to memberships.

'use client';

import { useEffect, useRef } from 'react';

import { MSG } from '@arcadia/shared';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import type { ColyseusConnection } from './colyseus-client';
import { eventBus } from './event-bus';

type Props = {
  readonly memberId: string | null | undefined;
  /** Optional — pass when the host scene owns a Colyseus connection
   *  (World, Tavern today). Academy + Market are single-player; omit. */
  readonly colyseus?: ColyseusConnection | null;
};

export function useLevelSync({ memberId, colyseus }: Props): void {
  const colyseusRef = useRef<ColyseusConnection | null | undefined>(colyseus);

  // Keep the ref pointed at the latest room so the effect below (which
  // only re-runs when memberId changes) can still find the live room
  // at emit time.
  useEffect(() => {
    colyseusRef.current = colyseus;
  }, [colyseus]);

  useEffect(() => {
    if (!memberId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`membership-level-${memberId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'memberships',
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          const newLevel = (payload.new as { level?: number })?.level;
          const oldLevel = (payload.old as { level?: number })?.level;
          if (typeof newLevel !== 'number' || typeof oldLevel !== 'number') return;
          if (newLevel === oldLevel) return;
          if (newLevel <= oldLevel) return; // only celebrate level-ups

          eventBus.emit('level-up', newLevel);

          const conn = colyseusRef.current;
          if (conn) {
            conn.send(MSG.UPDATE_LEVEL, { level: newLevel });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
