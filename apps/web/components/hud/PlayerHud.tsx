// Persistent player HUD overlay. Mounted by every Phaser-backed page
// (GameSquare, GameCoworkingInside, GameOutdoor, GameTavern). Two
// fixed-position children at z-index 70 (below modals at 80, so any
// popup/dashboard obscures them — exactly as Phase 14 spec asks).
//
// Subscribes to the local member's `memberships` row via Supabase
// Realtime. When `xp` changes server-side, the bar slides to the new
// percentage in the next render. The Realtime subscription is shared
// in spirit with `useLevelSync`, but kept local so the HUD is
// self-contained — drop the component into a new page and it works.

'use client';

import { useEffect, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AvatarId } from '@/components/game/scenes/shared/avatar-palette';

import { AvatarBadge } from './AvatarBadge';
import { XPLevelBadge } from './XPLevelBadge';

type Props = {
  readonly memberId: string;
  readonly avatarId: AvatarId;
  readonly displayName: string;
  /** XP at mount; the HUD subscribes to Realtime updates from then on. */
  readonly initialXp: number;
};

export function PlayerHud({
  memberId,
  avatarId,
  displayName,
  initialXp,
}: Props): React.JSX.Element {
  const [xp, setXp] = useState(initialXp);

  // Re-sync the local state if the parent re-fetches and passes a
  // different starting value (e.g. after navigating between scenes).
  useEffect(() => {
    setXp(initialXp);
  }, [initialXp]);

  // Subscribe to memberships UPDATE for this member only. Server source
  // of truth is the lesson-completion trigger that increments xp.
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
    <>
      <AvatarBadge avatarId={avatarId} displayName={displayName} />
      <XPLevelBadge xp={xp} />
    </>
  );
}
