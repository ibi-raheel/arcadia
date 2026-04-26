// Persistent player HUD overlay. Mounted by every Phaser-backed page
// (GameSquare, GameCoworkingInside, GameOutdoor, GameTavern). One
// fixed-position child at z-index 70 (below modals at 80, so any
// popup/dashboard obscures it — exactly as Phase 14 spec asks).
//
// Subscribes to the local member's `memberships` row via Supabase
// Realtime so XP changes propagate without a page reload.

'use client';

import { useEffect, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { PlayerBar } from './PlayerBar';
import type { HudRole } from './MenuIcons';

type Props = {
  readonly memberId: string;
  readonly displayName: string;
  /** XP at mount; the HUD subscribes to Realtime updates from then on. */
  readonly initialXp: number;
  /** Place name shown in the middle of the bar (e.g. "The Square",
   *  "The Iron Chalice", "Tent 3", "Academy Grounds"). */
  readonly location: string;
  /** Picks the right-section icon set. Default 'member'. */
  readonly role?: HudRole;
  /** When false (scene still preloading), the bar reserves layout
   *  space but renders invisible. Default true. */
  readonly loaded?: boolean;
};

export function PlayerHud({
  memberId,
  displayName,
  initialXp,
  location,
  role,
  loaded = true,
}: Props): React.JSX.Element {
  const [xp, setXp] = useState(initialXp);

  // Re-sync the local state if the parent re-fetches and passes a
  // different starting value (e.g. after navigating between scenes).
  useEffect(() => {
    setXp(initialXp);
  }, [initialXp]);

  // Subscribe to memberships UPDATE for this member only.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`hud-xp-${memberId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'memberships',
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          const next = (payload.new as { xp?: number })?.xp;
          if (typeof next === 'number') setXp(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);

  return (
    <PlayerBar displayName={displayName} xp={xp} location={location} role={role} loaded={loaded} />
  );
}
